# Kestrel Model 01

A 3D scrollytelling product site for a fictional running shoe. The shoe is a real-time
WebGL model that turns, tips and gets closer as you scroll through seven chapters. After
the story, the rest of the site scrolls up over it: reviews, spec sheet, journal,
newsletter and footer.

React 18 · TypeScript · Vite · Tailwind · React Three Fiber · drei · GSAP ScrollTrigger · Lenis · zustand

Author: vbuildlanka@gmail.com · © VBUILD™

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
```

Add `?debug` to the URL to expose the live pose on `window.__KESTREL_DEBUG__`. The
verification scripts read from it.

## What's on the page

| Chapter | What the shoe does | Copy |
|---------|--------------------|------|
| Model 01 | Three-quarter view from the toe, sitting right of the headline | Hero, price, CTAs |
| Upper | Camera moves in on the knit | Left, with pinned callouts |
| Cushion | Straight side profile, low camera | Stack heights pinned to the midsole |
| Grip | Tips forward to show the outsole | Right |
| Heel | Turns so you see it from behind | Left, with pinned callouts |
| Colour | Clean profile | Colourway picker |
| Buy | Heel-side hero shot | Size picker, add to bag |

Then: **Reviews → Spec sheet → Journal → Newsletter → Footer**, on a paper sheet that
slides over the fixed canvas. When the story is fully off screen the canvas stops
rendering (`frameloop="never"`).

Small details:
- The page accent (selection colour, chapter numbers, focus rings, nudges) changes to
  match the selected colourway.
- The shoe does a small hop when you change colour.
- Some sizes are sold out, and they're different for each colour.
- The loader shows real download progress.
- Footer: © VBUILD™. The only other credit is a link to the 3D model's CC BY 4.0
  licence page, which CC BY requires.

## How it's built

```
src/
  App.tsx                     layer order, accent sync, loader timeout
  config/
    product.ts                all copy that merch might edit: price, specs, colourways
    scrollSequence.ts         the seven chapter poses (camera, rotation, offset), easing
  components/
    Scene.tsx                 <Canvas>, lighting, camera rig
    ShoeModel.tsx             GLB load, KHR_materials_variants, idle motion, shadow
    Annotations.tsx           callouts pinned to points on the shoe
    ScrollSections.tsx        the story's copy + the master ScrollTrigger
    BackgroundLayers.tsx      paper wash · outline wordmark + grid · floor (parallax)
    LoadingScreen.tsx
    story/                    ColorwayPicker, BuyPanel
    site/                     SiteHeader (nav, bag, toast), AfterStory
  hooks/                      smooth scroll, env flags, pointer, canvas resize
  store/useSceneStore.ts      the one bridge between DOM and WebGL
```

**Scroll → 3D.** A single ScrollTrigger scrubs story progress `p` (0 → 1) into the
zustand store. Inside the canvas, `useFrame` reads it without subscribing, so scrolling
doesn't re-render React. Camera and shoe pose depend only on `p`, so scrolling forwards,
backwards or dragging the scrollbar always gives the same result. To re-choreograph the
story, edit the `CHAPTERS` array.

**Colourways.** The GLB ships three materials through `KHR_materials_variants`. Neither
GLTFLoader applies variants, so `ShoeModel` resolves all three materials up front,
uploads their textures to the GPU, and swaps `mesh.material` when you pick one. That's why
switching is instant.

**Colour accuracy.** Tone mapping is Khronos PBR Neutral, which was designed for
e-commerce. It keeps each colourway true to its texture on the white page, where ACES
would warm and desaturate it.

## The model

"Materials Variants Shoe" by Shopify, from the
[Khronos glTF sample assets](https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe),
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Credit appears in the site footer.

The source file is 7.8 MB with JPEG textures. It was optimised with
[glTF-Transform](https://gltf-transform.dev/), and the variants survive the process:

| File | Textures | Size | Used on |
|------|----------|------|---------|
| `public/models/kestrel-01.glb` | 2048² WebP + meshopt | 2.8 MB | desktop |
| `public/models/kestrel-01-1k.glb` | 1024² WebP + meshopt | 0.7 MB | phones (< 768px) |

```bash
npx @gltf-transform/cli webp    source.glb a.glb --quality 88
npx @gltf-transform/cli meshopt a.glb kestrel-01.glb
# 1K: run `resize --width 1024 --height 1024` first
```

## Journal images

`public/images/journal/`, 960×720 WebP:

| File | Source | Licence |
|------|--------|---------|
| `carbon-plate.webp` | Rendered from this site's own 3D scene (`scripts/render-still.sh`) | — |
| `porto-rain.webp` | [rawpixel 3302924](https://www.rawpixel.com/image/3302924/free-photo-image-nature-street-downtown) | CC0 |
| `worn-out.webp` | [rawpixel 3291890](https://www.rawpixel.com/image/3291890/free-photo-image-abandoned-animal-apparel) | CC0 |

CC0 requires no attribution. Before choosing each photo I checked it up close for
visible brand logos, so the site shows no third-party trademarks.

## Phones and accessibility

| | Phones (< 768px) | `prefers-reduced-motion` |
|---|---|---|
| Model | 1K textures | — |
| DPR / shadows | capped at 1.5 / 384px | — |
| Framing | camera pulls back to fit the width; copy stacks under the shoe | — |
| Callouts | fewer, shown as compact tags | — |
| Idle sway, bob, pointer tilt | tilt off (touch) | all off |
| Smooth scroll (Lenis) | native touch scroll | off |
| Scroll-driven moves | kept | kept, with linear easing |

Canvas resizing uses a `ResizeObserver` and `visualViewport`, so it still works when mobile
browser toolbars appear or hide.

## Verification

These run against `dist/`, so build first. They need `agent-browser`.

| Script | Checks |
|---|---|
| `npm run verify:story` | Screenshots every chapter plus the after-story sections, on desktop (1440×900) and phone (390×844), and logs the camera for each. |
| `npm run verify:motion` | Idle sway, bob, pointer tilt and Lenis are on by default. Under reduced motion they read exactly 0 or off, and scroll still drives the story. |
| `scripts/render-still.sh` | Renders a studio still of the shoe (any chapter pose and colourway) with the page chrome hidden. |
| `npm run verify:shop` | Colour swap changes the 3D material and the page accent. Add-to-bag without a size is refused. Sold-out sizes are disabled. Adding a size updates the bag count, toast and bag contents. |

Every screenshot is shrunk to ≤ 1568px on its longest side
(`scripts/shrink-screenshots.py`), because multi-image model requests reject images over
2000px.

## Deploying

`vercel.json` sets the Vite preset and caches `/models`, `/hdri` and `/assets`
permanently. The studio HDR is self-hosted, so nothing at runtime depends on a
third-party CDN except Google Fonts.
