# NOIR AMBRE

A full-screen, dark-themed 3D product landing page for a fictional luxury fragrance brand.
The centrepiece is a photorealistic glass perfume bottle built **entirely from primitives at
runtime** — there is no GLTF, OBJ or any other 3D model file in this repository.

React 18 · TypeScript · Vite · Tailwind CSS · React Three Fiber · drei · postprocessing · GSAP ScrollTrigger

---

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build to dist/
npm run validate   # geometry + camera-framing checks (no browser needed)
```

Append `?debug` to the URL to publish the bottle's live transform on
`window.__NOIR_DEBUG__` (progress, group rotation, cap position, camera). This is what the
verification scripts assert against.

## Deploying to Vercel

`vercel.json` pins the Vite preset, `dist` as the output directory, and immutable cache
headers for `/fonts`, `/hdri` and `/assets`. Import the repo and deploy — no further setup.

Two things were done specifically so the production deploy is self-contained:

- **The environment map is self-hosted.** drei's `preset="studio"` hard-overrides its load
  path to a third-party CDN (`raw.githack.com`). The env map is what makes the glass look
  like glass, so a CDN failure there is a visible defect, not a graceful degradation. The
  preset is still used as specified, but `Scene.tsx` wraps it in an error boundary that
  falls back to a byte-identical copy at `/public/hdri/studio_small_03_1k.hdr`.
- **The label font is self-hosted.** `/public/fonts/CormorantGaramond-Italic.woff`
  (SIL Open Font License, see `OFL.txt`) rather than a Google Fonts fetch from inside WebGL.

---

## Structure

```
src/
  App.tsx                      layer composition + the loader's hard timeout
  components/
    Scene.tsx                  <Canvas>, lights, Environment, camera rig, post FX
    BottleModel.tsx            the bottle: geometry, materials, idle motion, cap lift
    BackgroundLayers.tsx       z-0 gradient · z-1 bokeh · z-2 vignette + parallax
    ScrollSections.tsx         500vh of copy; owns the master ScrollTrigger
    LoadingScreen.tsx          gold ring + wordmark, fades on assetsReady
  config/
    bottleProfile.ts           lathe profile, geometry builders, framing helper
    scrollSequence.ts          every keyframe: camera path, cap track, parallax rates
    studioBackdrop.ts          the gradient the glass refracts
    palette.ts                 reads the CSS variables so 3D and DOM cannot drift
  hooks/
    useEnvironmentFlags.ts     isMobile + prefers-reduced-motion, matchMedia-driven
    usePointerParallax.ts      normalised pointer tracking
    useCanvasResize.ts         ResizeObserver + visualViewport
  store/useSceneStore.ts       the single DOM -> R3F bridge (zustand)
```

### How scroll drives the 3D scene

GSAP owns native scroll. One master ScrollTrigger scrubs a proxy value and writes it to the
zustand store; everything inside the `<Canvas>` reads it **imperatively inside `useFrame`**
via `getSceneState()`, never as a reactive selector — otherwise the R3F tree would re-render
60×/second while scrolling.

The page is 500vh with five 100vh sections, so master progress `p` runs 0→1 across the 400vh
of scrollable distance, and section *N* is on screen at `p = (N−1) × 0.25`:

| `p` | section | camera | state |
|------|---------|--------|-------|
| 0.00 | 1 hero | `[0, 0, 6]` | idle: spin + bob + pointer tilt |
| 0.25 | 2 notes | `[1.2, 0.3, 4.5]` | orbit right, push in |
| 0.50 | 3 cap lift | `[-1, 0.5, 4]` | cap rising |
| 0.75 | 4 craft | `[0, 0.2, 7]` | pulled back, cap open |
| 1.00 | 5 CTA | `[0, 0, 5.5]` | cap re-seated, label front and centre |

The camera and the cap are **pure functions of `p`** — no tween state anywhere. That is what
makes the sequence scrub identically forwards, backwards, and when dragging the scrollbar.

---

## Tuning the look

Every material block in `BottleModel.tsx` is commented, with values from the brief marked
`[spec]` and supporting values explained. The highest-leverage knobs:

| What | Where | Note |
|---|---|---|
| Glass refraction | `MeshTransmissionMaterial` on the body | `roughness` 0.04 → 0.1 frosts it fast |
| Front highlight | `envMapIntensity` / `clearcoat` on the body | The bright vertical streak is the studio HDR's strip softbox reflecting off the front wall — the signature product-photography cue, but it clips to white at the specified `envMapIntensity` 1.2 with `clearcoat` 1 stacked over `roughness` 0.04. Drop `envMapIntensity` toward 0.8, or `clearcoat` toward 0.5, to pull it back. |
| Glass silhouette | `KEY_PROFILE` in `bottleProfile.ts` | 18 control points → spline → lathe |
| The studio lightbox | `studioBackdrop.ts` | contrast here *is* the glassiness |
| Liquid glow | `emissiveIntensity` on the liquid | 0 = strictly physical, 0.5 = lamp-like |
| Fill level | `LIQUID_TOP_Y` | see the note in `bottleProfile.ts` |

After changing any camera or cap value, re-run `npm run validate:framing` — it walks the
whole scroll range and checks the bottle stays inside the frustum.

---

## Notes on the brief

A few places where the specification was internally inconsistent. In each case the
reasoning is recorded in a comment at the relevant line.

1. **Liquid fill.** "Filled to 68% of body height" and "top surface sits at y = −0.15" cannot
   both hold for a 1.6-unit body spanning −0.8→+0.8: 68% puts the meniscus at y = +0.288,
   while y = −0.15 is a 41% fill. The explicit coordinate was honoured, since it is the one
   that guarantees the stated intent (visible headspace) at every camera angle.
   `LIQUID_TOP_Y` is a single constant if you want the other reading.
2. **Label placement.** The brief gives a literal `z` of 0.56 *and* the rule "at radius +
   0.001". They disagree — the lathe's radius at y = −0.1 is ~0.62, so 0.56 would bury the
   label inside the glass wall. The rule was treated as the governing intent and `z` is
   computed from the real profile. The offset itself was opened up from 0.001 to 0.012,
   because 0.001 is below depth-buffer precision here and the label's lower edge visibly
   serrated against the glass.
3. **Cap lift vs. camera.** The brief fixes both the lift (+0.5) and the closest camera
   position (`z = 4`). At `z = 4` the frustum is ~2.6 units tall while the bottle is 2.375 at
   rest and 2.875 with the cap raised — so a lift completing at `p = 0.5` would push the cap
   out of frame at the exact moment it is the subject. Two changes resolve it without
   touching any specified coordinate: the lift is paced to finish at `p = 0.68` (once the
   camera has begun its pull-back), and the camera aims at the assembly's vertical centre,
   which rises with the cap. It is still tight by design — `validate:framing` reports the
   remaining clearance as 0.014 units at the pinch point, split evenly top and bottom.
4. **Body height.** The lathe stops at y = 0.775 rather than 0.8 so it butt-joins the neck
   exactly. Overlapping two *transmissive* surfaces refracted that band twice and produced a
   blown-out hotspot at the shoulder. Body height is therefore 1.575, not 1.6.
5. **`backside` is off** on the glass. With a solid 0.62-unit-thick lathe, a second
   refraction pass turned the body into a lens and focused the HDR's softbox into a white
   column down the centre of the bottle.
6. **Label material** is `meshPhysicalMaterial`, a strict superset of `meshStandardMaterial`,
   so every specified value is unchanged. It exposes `specularIntensity`, which was needed:
   at roughness 0.6 under the 2.2-intensity key light the near-black stock rendered mid-grey.

### Lighting gels

The palette is the only source of colour in the UI. The two exceptions are the light gels
specified in the brief — `#fff4e0` (key) and `#8899ff` (rim). Both are white with a tint
rather than new hues, and they are collected in `LIGHT_GELS` in `palette.ts`.

---

## Performance & accessibility

| | Mobile (< 768px) | `prefers-reduced-motion` |
|---|---|---|
| Bokeh particles | 15 (from 40) | float animation off |
| Device pixel ratio | capped `[1, 1.5]` | — |
| Chromatic aberration | disabled | — |
| Transmission buffer | 512, 4 samples | — |
| Camera travel | 60% of desktop distance | unchanged, but linear (no easing) |
| Idle spin / bob / pointer tilt | unchanged | all disabled |

Canvas resize is driven by a `ResizeObserver` on the canvas's container plus a
`visualViewport` listener, not a bare `window.resize` — mobile Safari and Chrome collapse
their browser chrome mid-scroll, which changes the element box without reliably firing a
window resize.

---

## Verification

Run without a browser:

| Script | Checks |
|---|---|
| `npm run validate:profile` | 18 control points, no negative radii or NaNs, hourglass is wider at 30%/70% and pinched at 50%, clean shoulder taper, exact neck/cap seams, liquid clearance, constant label standoff |
| `npm run validate:framing` | Walks the scroll range on desktop and mobile; asserts the base, cap crown and shadow plane stay inside the frustum |

Headless browser checks (`scripts/`, require the `dist` build):

| Script | Checks |
|---|---|
| `verify-render.sh` | Serves `dist`, captures a screenshot per section, asserts 500vh page height, z-order 0/1/2, CTA colour and copy |
| `verify-variants.sh` | Asserts via `?debug` that idle spin/bob/tilt are live by default, that the cap lift is symmetric in both scroll directions, that mobile drops to 15 particles and 60% camera travel, and that reduced-motion freezes all three idle motions while the scroll camera keeps working |

Verified results on the current build: page height exactly 500vh, background layers at
z-index 0/1/2 with the canvas at 10 and copy at 20, no console errors, CTA renders
`DISCOVER THE COLLECTION` on `rgb(201,166,104)`, cap lift scrubs symmetrically
(`p` 0.51 → capProgress 0.414 → 1.000 at 0.71 → back to 0.000), mobile reports 15 particles
and a section-2 camera of `[0.67, 0.17, 5.16]` against the expected `[0.72, 0.18, 5.10]`,
and reduced motion holds rotation, tilt and bob at exactly 0 while the camera still resolves
to `[0, 0, 5.5]` at the bottom of the page.

One limitation worth stating: the reduced-motion run emulates the preference by patching
`window.matchMedia`, which JavaScript reads but CSS does not. The JS-side downgrades are
therefore asserted numerically; the CSS `@media (prefers-reduced-motion: reduce)` block that
stops the bokeh and loader animations is verified statically, not at runtime.

---

## Licence

`public/fonts/OFL.txt` covers the bundled Cormorant Garamond files.
`public/hdri/studio_small_03_1k.hdr` is from
[pmndrs/drei-assets](https://github.com/pmndrs/drei-assets), originally
[Poly Haven](https://polyhaven.com/) (CC0).
