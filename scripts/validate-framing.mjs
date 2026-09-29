/**
 * Framing check for the whole scroll sequence.
 *
 * The camera positions are fixed by the brief and the bottle is 2.375 units
 * tall at rest, so the vertical frame gets tight at the closest approach
 * (z = 4). This walks the entire scroll range and reports, at every step,
 * whether the bottle's base, the cap's crown and the contact-shadow plane are
 * all still inside the frustum.
 *
 * Run: node scripts/validate-framing.mjs
 */

const FOV = 35;
// Aim = vertical centre of the assembly, matching subjectCenterY() in
// src/config/bottleProfile.ts.

const CAP_LIFT_START = 0.375;
const CAP_LIFT_END = 0.68;
const CAP_RESEAT_START = 0.75;
const CAP_RESEAT_END = 1.0;
const CAP_LIFT_HEIGHT = 0.5;

const CAP_REST_Y = 1.35;
const CAP_HEIGHT = 0.45;
const BODY_BOTTOM_Y = -0.8;
const SHADOW_Y = -1.4;

const KEYFRAMES = [
  { at: 0.0, position: [0, 0, 6] },
  { at: 0.25, position: [1.2, 0.3, 4.5] },
  { at: 0.5, position: [-1, 0.5, 4] },
  { at: 0.75, position: [0, 0.2, 7] },
  { at: 1.0, position: [0, 0, 5.5] },
];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const invLerp = (a, b, v) => (a === b ? 0 : clamp01((v - a) / (b - a)));
const smoothstep = (t) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
const lerp = (a, b, t) => a + (b - a) * t;

function capProgress(p) {
  if (p <= CAP_LIFT_START) return 0;
  if (p < CAP_LIFT_END) return smoothstep(invLerp(CAP_LIFT_START, CAP_LIFT_END, p));
  if (p <= CAP_RESEAT_START) return 1;
  if (p < CAP_RESEAT_END) return 1 - smoothstep(invLerp(CAP_RESEAT_START, CAP_RESEAT_END, p));
  return 0;
}

function cameraAt(p, mobile = false) {
  const scale = mobile ? 0.6 : 1;
  const hero = KEYFRAMES[0].position;
  const kf = KEYFRAMES.map(({ at, position }) => ({
    at,
    position: position.map((v, i) => hero[i] + (v - hero[i]) * scale),
  }));

  const progress = clamp01(p);
  if (progress <= kf[0].at) return kf[0].position;
  const last = kf[kf.length - 1];
  if (progress >= last.at) return last.position;

  for (let i = 0; i < kf.length - 1; i += 1) {
    const a = kf[i];
    const b = kf[i + 1];
    if (progress >= a.at && progress <= b.at) {
      const t = smoothstep(invLerp(a.at, b.at, progress));
      return [
        lerp(a.position[0], b.position[0], t),
        lerp(a.position[1], b.position[1], t),
        lerp(a.position[2], b.position[2], t),
      ];
    }
  }
  return last.position;
}

/** Vertical half-extent of the frustum at the look-at plane. */
function halfExtent(camera, lookAtY) {
  const dx = camera[0] - 0;
  const dy = camera[1] - lookAtY;
  const dz = camera[2] - 0;
  const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return distance * Math.tan(((FOV / 2) * Math.PI) / 180);
}

function evaluate(p, mobile) {
  const camera = cameraAt(p, mobile);
  const cap = capProgress(p);
  const crownY = CAP_REST_Y + CAP_LIFT_HEIGHT * cap + CAP_HEIGHT / 2;
  const lookAtY = (crownY + BODY_BOTTOM_Y) / 2;
  const half = halfExtent(camera, lookAtY);

  const frameTop = lookAtY + half;
  const frameBottom = lookAtY - half;

  return {
    camera,
    cap,
    lookAtY,
    crownY,
    frameTop,
    frameBottom,
    capHeadroom: frameTop - crownY,
    baseHeadroom: BODY_BOTTOM_Y - frameBottom,
    shadowHeadroom: SHADOW_Y - frameBottom,
  };
}

function report(label, mobile) {
  console.log(`\n================ ${label} ================`);
  console.log(
    '    p   cam(x,y,z)                 cap%  aimY   frameTop  crownY  capGap   baseGap  shadowGap',
  );

  let capFail = 0;
  let baseFail = 0;
  let shadowFail = 0;
  let worstCap = Infinity;
  let worstBase = Infinity;

  for (let i = 0; i <= 40; i += 1) {
    const p = i / 40;
    const r = evaluate(p, mobile);
    worstCap = Math.min(worstCap, r.capHeadroom);
    worstBase = Math.min(worstBase, r.baseHeadroom);
    if (r.capHeadroom < 0) capFail += 1;
    if (r.baseHeadroom < 0) baseFail += 1;
    if (r.shadowHeadroom < 0) shadowFail += 1;

    // Print only the keyframes and the cap-lift window, to stay readable.
    const interesting =
      i % 5 === 0 || (p >= CAP_LIFT_START - 0.02 && p <= CAP_LIFT_END + 0.02 && i % 2 === 0);
    if (!interesting) continue;

    const cam = r.camera.map((v) => v.toFixed(2).padStart(5)).join(',');
    console.log(
      `  ${p.toFixed(3)}  [${cam}]  ${(r.cap * 100).toFixed(0).padStart(4)}%  ` +
        `${r.lookAtY.toFixed(2).padStart(5)}  ${r.frameTop.toFixed(3).padStart(7)}  ` +
        `${r.crownY.toFixed(3).padStart(6)}  ${r.capHeadroom.toFixed(3).padStart(7)}  ` +
        `${r.baseHeadroom.toFixed(3).padStart(7)}  ${r.shadowHeadroom.toFixed(3).padStart(7)}` +
        `${r.capHeadroom < 0 ? '  <-- CAP CROPPED' : ''}` +
        `${r.baseHeadroom < 0 ? '  <-- BASE CROPPED' : ''}`,
    );
  }

  console.log(`\n  cap crown cropped at    : ${capFail}/41 samples`);
  console.log(`  bottle base cropped at  : ${baseFail}/41 samples`);
  console.log(`  shadow off-frame at     : ${shadowFail}/41 samples (cosmetic only)`);
  console.log(`  tightest cap clearance  : ${worstCap.toFixed(4)}`);
  console.log(`  tightest base clearance : ${worstBase.toFixed(4)}`);

  return capFail === 0 && baseFail === 0;
}

const desktopOk = report('DESKTOP', false);
const mobileOk = report('MOBILE (60% travel)', true);

console.log(
  `\nRESULT: ${desktopOk && mobileOk ? 'PASS — subject stays framed throughout' : 'FAIL — see cropped samples above'}`,
);
process.exit(desktopOk && mobileOk ? 0 : 1);
