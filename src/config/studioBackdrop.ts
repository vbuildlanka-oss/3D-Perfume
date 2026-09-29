import * as THREE from 'three';

import { PALETTE } from './palette';

/**
 * A backdrop that exists only for the glass to refract.
 *
 * drei's MeshTransmissionMaterial swaps its `background` into
 * `scene.background` for the duration of its own transmission render, then
 * puts the original back. That makes this texture invisible in the main
 * render — the canvas stays transparent and the DOM parallax layers still
 * show through — while giving the refraction something real to bend.
 *
 * Why it matters: with a flat near-black background the glass had no tonal
 * range at all, so every pixel of the bottle resolved to black except where
 * it caught the studio HDR's softbox, which then focused into a single
 * blown-out caustic column. A vertical ramp with one soft warm band is how
 * a real lightbox is built — a dark surround with a bright card — and it is
 * what makes the waist, the shoulder and the base lens read as glass.
 *
 * Everything here is drawn from the project palette: --bg-base, --bg-elevated
 * and a low-opacity --accent-gold for the warm kicker.
 */

/** Tall and narrow: it is a pure vertical ramp, width is irrelevant. */
const WIDTH = 4;
const HEIGHT = 512;

export function createStudioBackdropTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const context = canvas.getContext('2d');
  if (!context) {
    // Extremely unlikely; fall back to a flat elevated tone.
    return new THREE.DataTexture(new Uint8Array([20, 17, 15, 255]), 1, 1);
  }

  /**
   * Contrast is what sells glass. An even ramp made the body look like flat
   * tan plastic, so the profile below is deliberately punchy: a solid dark
   * top, a narrow warm card at the waist, then a fall to pure black at the
   * floor for the base lens to focus. The hard-ish transitions are the point
   * — they become the bright and dark bands that travel across the glass as
   * the bottle turns.
   */
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT);
  // Deep shadow above the subject.
  gradient.addColorStop(0.0, PALETTE.bgBase);
  gradient.addColorStop(0.18, PALETTE.bgBase);
  gradient.addColorStop(0.32, PALETTE.bgElevated);
  // Narrow warm bounce card, roughly level with the bottle's waist.
  gradient.addColorStop(0.44, mix(PALETTE.bgElevated, PALETTE.accentGold, 0.2));
  gradient.addColorStop(0.5, mix(PALETTE.bgElevated, PALETTE.accentGold, 0.28));
  gradient.addColorStop(0.58, mix(PALETTE.bgElevated, PALETTE.accentGold, 0.2));
  gradient.addColorStop(0.7, PALETTE.bgElevated);
  gradient.addColorStop(0.84, PALETTE.bgBase);
  // Pure black floor: maximum contrast for the thick glass base to bend.
  gradient.addColorStop(1.0, '#000000');

  context.fillStyle = gradient;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

/** Blend two CSS hex colours in sRGB and return a hex string. */
function mix(a: string, b: string, amount: number): string {
  const colorA = new THREE.Color(a);
  const colorB = new THREE.Color(b);
  const result = colorA.clone().lerp(colorB, amount);
  return `#${result.getHexString()}`;
}
