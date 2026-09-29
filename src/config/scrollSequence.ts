import * as THREE from 'three';

/* ================================================================== *
 * SCROLL SEQUENCE — single source of truth
 *
 * The page is 500vh tall with five 100vh sections. The master
 * ScrollTrigger spans the container, so master progress `p` runs 0 -> 1
 * across the 400vh of actually-scrollable distance. That means section N
 * reaches the top of the viewport at p = (N - 1) * 0.25:
 *
 *   p = 0.00  section 1 (hero)        on screen
 *   p = 0.25  section 2 (notes)       on screen
 *   p = 0.50  section 3 (cap lift)    on screen
 *   p = 0.75  section 4 (craft)       on screen
 *   p = 1.00  section 5 (CTA)         on screen
 *
 * Each camera keyframe below is therefore "where the camera rests while
 * that section is on screen", and the travel between two keyframes is
 * what the user scrubs through on the way there.
 * ================================================================== */

export const SECTION_COUNT = 5;
/** Number of section boundaries the scroll crosses (5 sections -> 4 gaps). */
export const SCROLL_SPAN = SECTION_COUNT - 1;
/** Master progress width of one section's scroll window. */
export const SECTION_STEP = 1 / SCROLL_SPAN; // 0.25

export interface CameraKeyframe {
  /** Master scroll progress at which the camera sits exactly here. */
  at: number;
  position: [number, number, number];
}

/** Desktop camera path. Index i corresponds to section i + 1. */
export const CAMERA_KEYFRAMES: CameraKeyframe[] = [
  { at: 0.0, position: [0, 0, 6] }, // S1 hero — straight on, full bottle
  { at: 0.25, position: [1.2, 0.3, 4.5] }, // S2 — orbit right + push in
  { at: 0.5, position: [-1, 0.5, 4] }, // S3 — continue orbit left, look down
  { at: 0.75, position: [0, 0.2, 7] }, // S4 — pull back for the craft copy
  { at: 1.0, position: [0, 0, 5.5] }, // S5 — settled final hero shot
];

/** The hero position is the anchor that mobile travel is compressed toward. */
const HERO_POSITION = CAMERA_KEYFRAMES[0].position;

/** Mobile shortens every camera move to ~60% of its desktop distance (-40%). */
export const MOBILE_TRAVEL_SCALE = 0.6;

/**
 * Compress the whole path toward the hero anchor. Keeps the shape of the
 * move (same directions, same rhythm) but shortens the distance so the
 * sequence still reads on a short mobile scroll.
 */
export function getCameraKeyframes(isMobile: boolean): CameraKeyframe[] {
  if (!isMobile) return CAMERA_KEYFRAMES;

  return CAMERA_KEYFRAMES.map(({ at, position }) => ({
    at,
    position: [
      HERO_POSITION[0] + (position[0] - HERO_POSITION[0]) * MOBILE_TRAVEL_SCALE,
      HERO_POSITION[1] + (position[1] - HERO_POSITION[1]) * MOBILE_TRAVEL_SCALE,
      HERO_POSITION[2] + (position[2] - HERO_POSITION[2]) * MOBILE_TRAVEL_SCALE,
    ] as [number, number, number],
  }));
}

/* ------------------------------------------------------------------ *
 * CAP LIFT TRACK (section 3 milestone)
 *
 * Section 3's scroll window is p ∈ [0.25, 0.50]; its midpoint — "scroll
 * progress 0.5 through this section" — is p = 0.375. The lift runs from
 * there to the point where section 3 is fully on screen, holds open
 * through section 4, then re-seats across section 5 so the final shot is
 * a clean, closed bottle.
 *
 * This is a pure function of scroll progress, which is exactly why the
 * whole move is scrubbable in both directions: there is no tween state
 * to get out of sync, dragging the scrollbar backwards simply evaluates
 * the track at a lower p.
 * ------------------------------------------------------------------ */
export const CAP_LIFT_START = 0.375; // 50% through section 3 — the trigger
/**
 * The brief pins when the lift *starts* but not when it finishes.
 *
 * It cannot finish at p = 0.50. That is the camera's closest approach
 * ([-1, 0.5, 4]), where the vertical frame is only ~2.6 units tall — and the
 * bottle already stands 2.375 units from base to crown at rest. There is
 * simply not room there for a 0.5-unit lift as well: something has to be
 * cropped, and cropping the cap at the exact moment the cap is the subject is
 * the one thing worth avoiding.
 *
 * So the lift is paced to finish at 0.68, by which point the camera has begun
 * its pull-back toward section 4 and the frame has opened up. Combined with
 * the look-at tilt in Scene.tsx (which tracks the cap as it rises), the whole
 * move stays inside the frame from start to finish — verified numerically by
 * scripts/validate-framing.mjs.
 */
export const CAP_LIFT_END = 0.68;
export const CAP_RESEAT_START = 0.75; // section 4 -> 5 handoff
export const CAP_RESEAT_END = 1.0; // settled, closed

/** Peak lift offset in world units, added to the cap's rest Y. */
export const CAP_LIFT_HEIGHT = 0.5;
/** Peak twist in radians. */
export const CAP_LIFT_ROTATION = 2.4;

export function getCapProgress(p: number): number {
  if (p <= CAP_LIFT_START) return 0;
  if (p < CAP_LIFT_END) {
    return smoothstep(invLerp(CAP_LIFT_START, CAP_LIFT_END, p));
  }
  if (p <= CAP_RESEAT_START) return 1;
  if (p < CAP_RESEAT_END) {
    return 1 - smoothstep(invLerp(CAP_RESEAT_START, CAP_RESEAT_END, p));
  }
  return 0;
}

/* ------------------------------------------------------------------ *
 * DOM PARALLAX RATES (background layers)
 * Layer 3 (vignette) is deliberately locked to the viewport — a vignette
 * that slides looks like a bug. Foreground text scrolls at 1x, i.e. it
 * gets no transform at all.
 * ------------------------------------------------------------------ */
export const PARALLAX_RATES = {
  gradient: 0.1, // z-0
  bokeh: 0.25, // z-1
  vignette: 0, // z-2
} as const;

/* ------------------------------------------------------------------ *
 * Interpolation helpers
 * ------------------------------------------------------------------ */

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Where does `v` sit between `a` and `b`, clamped to 0..1? */
export function invLerp(a: number, b: number, v: number): number {
  if (a === b) return 0;
  return clamp01((v - a) / (b - a));
}

/** Classic 3t² - 2t³ ease. Used for the cap only, never for the camera. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Sample the camera path at master progress `p`.
 *
 * `linear` is set when prefers-reduced-motion is on: the segment is
 * traversed with no easing whatsoever. Otherwise each segment gets a
 * smoothstep so the bottle eases into and out of every rest position
 * instead of changing direction with a visible corner.
 */
export function sampleCameraPath(
  keyframes: CameraKeyframe[],
  p: number,
  linear: boolean,
  target: THREE.Vector3,
): THREE.Vector3 {
  const progress = clamp01(p);

  if (progress <= keyframes[0].at) {
    const [x, y, z] = keyframes[0].position;
    return target.set(x, y, z);
  }

  const last = keyframes[keyframes.length - 1];
  if (progress >= last.at) {
    const [x, y, z] = last.position;
    return target.set(x, y, z);
  }

  for (let i = 0; i < keyframes.length - 1; i += 1) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (progress >= a.at && progress <= b.at) {
      const raw = invLerp(a.at, b.at, progress);
      const t = linear ? raw : smoothstep(raw);
      return target.set(
        THREE.MathUtils.lerp(a.position[0], b.position[0], t),
        THREE.MathUtils.lerp(a.position[1], b.position[1], t),
        THREE.MathUtils.lerp(a.position[2], b.position[2], t),
      );
    }
  }

  const [x, y, z] = last.position;
  return target.set(x, y, z);
}
