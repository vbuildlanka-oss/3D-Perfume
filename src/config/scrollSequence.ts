import * as THREE from 'three';

/* ================================================================== *
 * SCROLL SEQUENCE — the single source of truth for the 3D story.
 *
 * The story is CHAPTERS.length × 100vh tall. The master ScrollTrigger
 * spans that container only, so progress `p` runs 0 -> 1 across its
 * scrollable distance and chapter N owns the viewport at p = N / (count-1).
 *
 * Each keyframe says where the camera sits and how the shoe is posed
 * while that chapter is on screen. Everything in between is interpolated,
 * and everything is a pure function of `p` — no tween state — so it
 * scrubs identically forwards, backwards, and when dragging the scrollbar.
 *
 * Shoe space (after ShoeModel normalises the GLB):
 *   toe at -X · heel at +X · +Y up · the camera looks down -Z.
 *   rotation.y > 0 brings the toe towards the camera, < 0 the heel.
 *   rotation.x < 0 tips the outsole towards the camera.
 * ================================================================== */

type Vec3 = [number, number, number];

export interface Chapter {
  id: string;
  /** Short label for the chapter rail. */
  label: string;
  camera: Vec3;
  /** Shoe rotation in radians (XYZ order). */
  rotation: Vec3;
  /** Shoe offset in world units — makes room for the copy. */
  offset: Vec3;
  /** Phones stack copy under the shoe, so only a vertical lift is needed. */
  mobileLift: number;
}

export const CHAPTERS: Chapter[] = [
  // Three-quarter from the toe, sitting right of the headline.
  {
    id: 'intro',
    label: 'Model 01',
    camera: [0, 0.35, 6.4],
    rotation: [0.08, 0.62, -0.06],
    offset: [0.72, -0.12, 0],
    mobileLift: 0.95,
  },
  // Pushed in on the knit. Copy on the left.
  {
    id: 'upper',
    label: 'Upper',
    camera: [0.45, 0.45, 4.3],
    rotation: [0.22, 0.3, 0.02],
    offset: [0.6, -0.05, 0],
    mobileLift: 0.85,
  },
  // Straight lateral profile, camera low — the midsole is the subject.
  {
    id: 'cushion',
    label: 'Cushion',
    camera: [0, -0.05, 5.2],
    rotation: [0, 0, 0],
    offset: [0, 0.18, 0],
    mobileLift: 1.0,
  },
  // Tipped forward to show the outsole. Copy on the right.
  {
    id: 'grip',
    label: 'Grip',
    camera: [0, 0.1, 5.6],
    rotation: [-1.3, 0.2, 0.18],
    offset: [-0.78, 0.05, 0],
    mobileLift: 1.0,
  },
  // From behind — heel counter and pull tab. Copy on the left.
  {
    id: 'heel',
    label: 'Heel',
    camera: [0.3, 0.55, 5.0],
    rotation: [0.1, -1.2, 0.02],
    offset: [0.7, -0.08, 0],
    mobileLift: 0.9,
  },
  // Clean profile, lifted to clear the picker.
  {
    id: 'colour',
    label: 'Colour',
    camera: [0, 0.25, 5.9],
    rotation: [0.04, 0.12, 0.03],
    offset: [0, 0.3, 0],
    mobileLift: 1.0,
  },
  // Heel-side hero shot, left of the buy panel.
  {
    id: 'buy',
    label: 'Buy',
    camera: [0, 0.4, 6.2],
    rotation: [0.1, -0.5, 0.04],
    offset: [-0.72, 0.02, 0],
    mobileLift: 2.25,
  },
];

export const CHAPTER_COUNT = CHAPTERS.length;
export const SCROLL_SPAN = CHAPTER_COUNT - 1;
export const chapterAt = (index: number) => index / SCROLL_SPAN;

/* ------------------------------------------------------------------ *
 * Narrow viewports
 *
 * We don't author a second path. The camera is pushed back along its own
 * line of sight until the shoe fits the width, horizontal offsets are
 * dropped (copy stacks under the shoe instead of beside it) and lateral
 * camera travel is shortened by 40%.
 * ------------------------------------------------------------------ */
export const MOBILE_TRAVEL_SCALE = 0.6;
const MIN_FRAME_WIDTH = 3.7;
const FOV = 35;
const HALF_FOV_TAN = Math.tan(THREE.MathUtils.degToRad(FOV / 2));

export function getChapters(isMobile: boolean): Chapter[] {
  if (!isMobile) return CHAPTERS;
  return CHAPTERS.map((c) => ({
    ...c,
    camera: [c.camera[0] * MOBILE_TRAVEL_SCALE, c.camera[1] * MOBILE_TRAVEL_SCALE, c.camera[2]],
    offset: [0, c.mobileLift, 0],
  }));
}

/** How much further back the camera must sit for the shoe to fit `aspect`. */
export function distanceScaleForAspect(aspect: number, distance: number): number {
  const visibleWidth = 2 * distance * HALF_FOV_TAN * aspect;
  return Math.max(1, MIN_FRAME_WIDTH / visibleWidth);
}

/** DOM parallax rates for the background layers. Copy scrolls at 1x. */
export const PARALLAX_RATES = {
  wash: 0.06,
  wordmark: 0.18,
} as const;

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function invLerp(a: number, b: number, v: number): number {
  return a === b ? 0 : clamp01((v - a) / (b - a));
}

/** Smootherstep: zero velocity and acceleration at each keyframe, so the
 *  shoe settles into a pose rather than stopping in it. */
export function ease(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

export interface SampledPose {
  camera: THREE.Vector3;
  rotation: THREE.Vector3;
  offset: THREE.Vector3;
}

export const createSampledPose = (): SampledPose => ({
  camera: new THREE.Vector3(),
  rotation: new THREE.Vector3(),
  offset: new THREE.Vector3(),
});

const lerp3 = (out: THREE.Vector3, a: Vec3, b: Vec3, t: number) =>
  out.set(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);

/** Sample the pose at progress `p`. `linear` = prefers-reduced-motion. */
export function samplePose(chapters: Chapter[], p: number, linear: boolean, out: SampledPose) {
  const progress = clamp01(p);
  const scaled = progress * (chapters.length - 1);
  const i = Math.min(chapters.length - 2, Math.floor(scaled));
  const raw = scaled - i;
  const t = linear ? raw : ease(raw);

  lerp3(out.camera, chapters[i].camera, chapters[i + 1].camera, t);
  lerp3(out.rotation, chapters[i].rotation, chapters[i + 1].rotation, t);
  lerp3(out.offset, chapters[i].offset, chapters[i + 1].offset, t);
  return out;
}

/** 0..1 visibility of chapter `index` — peaks while it owns the viewport. */
export function chapterPresence(p: number, index: number, width = 0.55): number {
  const d = Math.abs(clamp01(p) * SCROLL_SPAN - index);
  return 1 - ease(clamp01(d / width));
}
