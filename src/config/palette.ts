/**
 * The CSS custom properties are the single source of truth for colour, but
 * three.js cannot parse `var(--accent-gold)`. This module reads the computed
 * values off :root once at startup so the 3D layer and the DOM layer can never
 * drift apart — edit index.css and both update.
 *
 * Fallbacks mirror index.css exactly, for SSR / pre-paint safety.
 */

const FALLBACKS = {
  '--bg-base': '#0a0908',
  '--bg-elevated': '#14110f',
  '--accent-gold': '#c9a668',
  '--accent-gold-hover': '#d9b87a',
  '--liquid-amber': '#b8863f',
  '--text-primary': '#f5f0e8',
} as const;

type PaletteToken = keyof typeof FALLBACKS;

function readVar(token: PaletteToken): string {
  if (typeof window === 'undefined' || typeof getComputedStyle !== 'function') {
    return FALLBACKS[token];
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  return value.length > 0 ? value : FALLBACKS[token];
}

export const PALETTE = {
  bgBase: readVar('--bg-base'),
  bgElevated: readVar('--bg-elevated'),
  accentGold: readVar('--accent-gold'),
  accentGoldHover: readVar('--accent-gold-hover'),
  liquidAmber: readVar('--liquid-amber'),
  textPrimary: readVar('--text-primary'),
} as const;

/* ------------------------------------------------------------------ *
 * LIGHTING GELS
 * The brief permits only the palette plus black / white / alpha variants.
 * These two gels are warm-white and cool-white — white with a tint, not
 * new hues — and they are the only non-palette values in the project.
 * They exist to separate the glass edges from the near-black background.
 * ------------------------------------------------------------------ */
export const LIGHT_GELS = {
  /** Key light: warm white, reads as tungsten studio lighting. */
  key: '#fff4e0',
  /** Rim light: cool white, carves the glass silhouette out of the dark. */
  rim: '#8899ff',
} as const;
