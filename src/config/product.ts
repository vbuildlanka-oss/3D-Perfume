/**
 * Everything a copywriter or merchandiser might want to change lives here:
 * names, prices, specs and the three colourways. Components only render it.
 */

export const BRAND = {
  name: 'Kestrel',
  model: 'Model 01',
  category: 'Daily trainer',
  price: 165,
  currency: 'USD',
} as const;

export type ColorwayId = 'harbour' | 'dune' | 'signal';

export interface Colorway {
  id: ColorwayId;
  /** Display name. */
  name: string;
  /** Name of the matching KHR_materials_variants entry inside the GLB. */
  variant: string;
  /** UI accent — sampled from the upper's base-colour texture, then darkened
   *  where needed so it holds up as a text colour on white. */
  accent: string;
  /** A light tint of the same colour, for backgrounds and swatch fills. */
  tint: string;
  /** One line of personality, shown under the picker. */
  note: string;
}

export const COLORWAYS: Colorway[] = [
  {
    id: 'harbour',
    name: 'Harbour',
    variant: 'midnight',
    accent: '#256a8f',
    tint: '#e6eff4',
    note: 'The blue of the water at 6 a.m., before anyone else is out.',
  },
  {
    id: 'dune',
    name: 'Dune',
    variant: 'beach',
    accent: '#9a6f70',
    tint: '#f3ecec',
    note: 'Dusty rose. Hides trail dust better than you’d expect.',
  },
  {
    id: 'signal',
    name: 'Signal',
    variant: 'street',
    accent: '#d23b3d',
    tint: '#faeaea',
    note: 'Mostly black, a little loud. Drivers see you at dusk.',
  },
];

export const DEFAULT_COLORWAY: ColorwayId = 'harbour';

export function getColorway(id: ColorwayId): Colorway {
  return COLORWAYS.find((c) => c.id === id) ?? COLORWAYS[0];
}

export const SPECS = [
  { label: 'Weight', value: '248 g', detail: 'US men’s 9' },
  { label: 'Heel stack', value: '34 mm' },
  { label: 'Forefoot', value: '26 mm' },
  { label: 'Drop', value: '8 mm' },
] as const;

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: BRAND.currency,
    maximumFractionDigits: 0,
  }).format(amount);
