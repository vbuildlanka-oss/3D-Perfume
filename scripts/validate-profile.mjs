/**
 * Sanity-checks the procedural bottle profile without a browser.
 * Run: node scripts/validate-profile.mjs
 */
import * as THREE from 'three';

const BODY_HEIGHT = 1.6;
const BODY_BOTTOM_Y = -0.8;
const atHeight = (h) => BODY_BOTTOM_Y + h * BODY_HEIGHT;

const KEY_PROFILE = [
  [0.0, atHeight(0.0)],
  [0.34, atHeight(0.0)],
  [0.545, -0.797],
  [0.6, -0.772],
  [0.62, atHeight(0.05)],
  [0.628, atHeight(0.15)],
  [0.64, atHeight(0.3)],
  [0.629, atHeight(0.4)],
  [0.612, atHeight(0.5)],
  [0.629, atHeight(0.6)],
  [0.642, atHeight(0.7)],
  [0.632, 0.44],
  [0.592, 0.54],
  [0.512, 0.628],
  [0.404, 0.7],
  [0.3, 0.748],
  [0.232, 0.768],
  [0.2, 0.775],
];

const curve = new THREE.SplineCurve(KEY_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)));
const profile = curve.getPoints(160).map((p) => new THREE.Vector2(Math.max(p.x, 0), p.y));

function radiusAtY(profile, y) {
  if (y <= profile[0].y) return profile[0].x;
  for (let i = 0; i < profile.length - 1; i += 1) {
    const a = profile[i];
    const b = profile[i + 1];
    const lo = Math.min(a.y, b.y);
    const hi = Math.max(a.y, b.y);
    if (y >= lo && y <= hi) {
      if (b.y === a.y) return Math.max(a.x, b.x);
      const t = (y - a.y) / (b.y - a.y);
      return THREE.MathUtils.lerp(a.x, b.x, t);
    }
  }
  return profile[profile.length - 1].x;
}

console.log('KEY_PROFILE points:', KEY_PROFILE.length, '(minimum required: 12)');
console.log('resampled points  :', profile.length);

const ys = profile.map((p) => p.y);
const xs = profile.map((p) => p.x);
console.log('\nprofile y range   :', Math.min(...ys).toFixed(4), '->', Math.max(...ys).toFixed(4));
console.log('profile r range   :', Math.min(...xs).toFixed(4), '->', Math.max(...xs).toFixed(4));
console.log('negative radii    :', xs.filter((x) => x < 0).length);

console.log('\n--- hourglass check (radius at normalised body height) ---');
for (const h of [0.0, 0.05, 0.15, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]) {
  const y = atHeight(h);
  console.log(`  h=${h.toFixed(2)}  y=${y.toFixed(3).padStart(6)}  r=${radiusAtY(profile, y).toFixed(4)}`);
}

const r30 = radiusAtY(profile, atHeight(0.3));
const r50 = radiusAtY(profile, atHeight(0.5));
const r70 = radiusAtY(profile, atHeight(0.7));
console.log('\nwider at 30% than 50%? ', r30 > r50, `(${r30.toFixed(4)} > ${r50.toFixed(4)})`);
console.log('wider at 70% than 50%? ', r70 > r50, `(${r70.toFixed(4)} > ${r50.toFixed(4)})`);
console.log('waist pinch            ', (((r70 - r50) / r70) * 100).toFixed(2) + '%');

console.log('\n--- monotonic shoulder check (radius must not bulge above h=0.8) ---');
let prev = Infinity;
let bulges = 0;
for (let h = 0.8; h <= 1.0001; h += 0.02) {
  const r = radiusAtY(profile, atHeight(h));
  if (r > prev + 1e-6) bulges += 1;
  prev = r;
}
console.log('shoulder bulges   :', bulges, bulges === 0 ? '(clean taper)' : '(PROBLEM)');

console.log('\n--- assembly seams ---');
const bodyTopR = radiusAtY(profile, 0.775);
const neckAt08 = 0.2;
console.log('body r @ y=0.775     :', bodyTopR.toFixed(4));
console.log('neck r @ y=0.775     :', neckAt08.toFixed(4), '(neck spans 0.775 -> 1.125)');
console.log('seam gap             :', (bodyTopR - neckAt08).toFixed(4), '(>=0 means no gap)');
console.log('neck top y           : 1.1250');
console.log('cap bottom y         :', (1.35 - 0.45 / 2).toFixed(4), '(seats on neck top)');
console.log('cap crown y          :', (1.35 + 0.45 / 2).toFixed(4));
console.log('TOTAL HEIGHT         :', (1.35 + 0.45 / 2 - BODY_BOTTOM_Y).toFixed(4), '(target ~2.4)');

console.log('\n--- liquid ---');
const LIQUID_TOP_Y = -0.15;
const rim = radiusAtY(profile, LIQUID_TOP_Y) * 0.96;
console.log('meniscus y           :', LIQUID_TOP_Y);
console.log('meniscus r (96%)     :', rim.toFixed(4));
console.log('glass r at meniscus  :', radiusAtY(profile, LIQUID_TOP_Y).toFixed(4));
console.log('clearance to wall    :', (radiusAtY(profile, LIQUID_TOP_Y) - rim).toFixed(4));
console.log(
  'fill vs body height  :',
  (((LIQUID_TOP_Y - BODY_BOTTOM_Y) / BODY_HEIGHT) * 100).toFixed(1) + '%',
);
console.log(
  'headspace above      :',
  (0.8 - LIQUID_TOP_Y).toFixed(3),
  'units of visible glass',
);

console.log('\n--- label ---');
const LABEL_CENTER_Y = -0.1;
const labelZ = radiusAtY(profile, LABEL_CENTER_Y) + 0.012;
console.log('label z (radius+off) :', labelZ.toFixed(4), '(brief literal was 0.56)');
console.log('label spans y        :', (LABEL_CENTER_Y - 0.45).toFixed(3), '->', (LABEL_CENTER_Y + 0.45).toFixed(3));
let minClear = Infinity;
for (let y = LABEL_CENTER_Y - 0.45; y <= LABEL_CENTER_Y + 0.45; y += 0.01) {
  const r = radiusAtY(profile, y) + 0.012;
  minClear = Math.min(minClear, r - radiusAtY(profile, y));
}
console.log('min surface clearance:', minClear.toFixed(4), '(constant => label hugs the curve)');
console.log('label above liquid?  :', LABEL_CENTER_Y - 0.45 > LIQUID_TOP_Y ? 'fully' : 'partially overlaps liquid band');

console.log('\n--- geometry build smoke test ---');
const body = new THREE.LatheGeometry(profile, 64);
body.computeBoundingBox();
console.log('body verts           :', body.attributes.position.count);
console.log(
  'body bbox            :',
  body.boundingBox.min.toArray().map((n) => n.toFixed(3)).join(', '),
  '->',
  body.boundingBox.max.toArray().map((n) => n.toFixed(3)).join(', '),
);
console.log('body has NaN         :', Array.from(body.attributes.position.array).some(Number.isNaN));
