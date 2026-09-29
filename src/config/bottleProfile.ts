import * as THREE from 'three';

/* ================================================================== *
 * BOTTLE PROFILE — the silhouette is the whole ballgame.
 *
 * Everything here is built from primitives at runtime. There is no GLTF,
 * no OBJ, no external model file of any kind.
 *
 * The body is a LatheGeometry rather than a CylinderGeometry because a
 * cylinder reads as "a grey tube" no matter how good the material is.
 * A lathe gives us three things a cylinder cannot:
 *
 *   1. A gentle hourglass waist, so the silhouette has a highlight that
 *      travels as the bottle turns.
 *   2. A rounded base fillet and a closed, thick glass floor — that is
 *      what produces the lens/caustic pool at the bottom of a real
 *      flacon and it is the single most convincing glass cue we get.
 *   3. A shoulder that tapers into the neck, so light pinches as it
 *      passes through the narrowing volume.
 *
 * The KEY_PROFILE points below are pushed through a Catmull-Rom
 * THREE.SplineCurve and resampled at high density before being lathed, so
 * the final surface is genuinely smooth — no visible facets on the
 * silhouette, which is what kills the illusion at close camera range.
 * ================================================================== */

/** Body dimensions. Total assembly height (base -> cap crown) is ~2.4 units. */
export const BODY_HEIGHT = 1.6;
export const BODY_BOTTOM_Y = -BODY_HEIGHT / 2; // -0.8
export const BODY_TOP_Y = BODY_HEIGHT / 2; // +0.8

/** Radial segments. 64 is the minimum that stops the waist looking polygonal. */
export const LATHE_SEGMENTS = 64;
/** How densely the spline is resampled along the profile before lathing. */
export const PROFILE_SAMPLES = 160;

/**
 * Convert a normalised height (0 = base, 1 = shoulder top) to world Y.
 * Used only to document the key points below.
 */
const atHeight = (h: number): number => BODY_BOTTOM_Y + h * BODY_HEIGHT;

/**
 * Key silhouette points: [radius, y]. 18 points, well past the 12 minimum.
 *
 * The hourglass is deliberately subtle — a ~5% waist. Anything stronger and
 * it stops looking like blown glass and starts looking like a vase.
 */
export const KEY_PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0.0, atHeight(0.0)], //  0.000  base centre — closes the floor into solid glass
  [0.34, atHeight(0.0)], //  0.000  flat base disc
  [0.545, -0.797], //         base disc outer
  [0.6, -0.772], //           bottom fillet (rounded glass edge)
  [0.62, atHeight(0.05)], //  0.050  wall begins, widest footprint
  [0.628, atHeight(0.15)], //  0.150
  [0.64, atHeight(0.3)], //   0.300  <-- WIDER at 30% height
  [0.629, atHeight(0.4)], //  0.400
  [0.612, atHeight(0.5)], //  0.500  <-- PINCHED waist at 50% height
  [0.629, atHeight(0.6)], //  0.600
  [0.642, atHeight(0.7)], //  0.700  <-- WIDER at 70% height
  [0.632, 0.44], //           shoulder begins
  [0.592, 0.54],
  [0.512, 0.628],
  [0.404, 0.7], //            shoulder tightens
  [0.3, 0.748],
  [0.232, 0.768], //          almost at the neck
  [0.2, 0.775], //            meets the neck's base exactly — see note below
];

/**
 * The profile stops at y = 0.775, not 0.800.
 *
 * 0.775 is precisely where the neck cylinder's lower face sits
 * (NECK_Y 0.95 - NECK_HEIGHT/2), and the neck's radius there is 0.2 — so the
 * two surfaces meet edge to edge with no overlap and no gap.
 *
 * The earlier version ran the body to 0.800 and let the neck intersect it.
 * Two *transmissive* surfaces overlapping meant that 0.025-unit band was
 * refracted twice, which produced a blown-out white hotspot at the shoulder
 * that Bloom then amplified. Butt-joining them removes it. Cost: the body is
 * 1.575 units tall rather than 1.6, which is invisible.
 */

/* ------------------------------------------------------------------ *
 * NECK / CAP / LIQUID / LABEL constants
 * ------------------------------------------------------------------ */

export const NECK_RADIUS_TOP = 0.16;
export const NECK_RADIUS_BOTTOM = 0.2;
export const NECK_HEIGHT = 0.35;
export const NECK_Y = 0.95; // spans y 0.775 -> 1.125, overlapping the shoulder

export const CAP_RADIUS = 0.22;
export const CAP_HEIGHT = 0.45;
/** Rest position. Seats exactly on the neck top (1.125) and crowns at 1.575. */
export const CAP_REST_Y = 1.35;

/**
 * Liquid fill height.
 *
 * NOTE — the brief specifies both "filled to 68% of body height" and "top
 * surface sits at y = -0.15 relative to body center". With a 1.6-unit body
 * spanning y -0.8 -> +0.8 those two cannot both hold: 68% fill puts the
 * meniscus at y = +0.288, while y = -0.15 is a 41% fill. The explicit
 * coordinate wins here because it is the one that guarantees the stated
 * intent ("visible headspace above the liquid") reads at every camera angle
 * in the scroll sequence. Change this one constant to 0.288 for a 68% fill.
 */
export const LIQUID_TOP_Y = -0.15;
/** Liquid radius as a fraction of the glass radius at the same height. */
export const LIQUID_RADIUS_SCALE = 0.96;
/** Lifts the liquid floor off the glass floor so the two never z-fight. */
export const LIQUID_FLOOR_EPSILON = 0.02;

/** Top of the cap at rest. The tallest point of the assembly. */
export const CAP_CROWN_REST_Y = CAP_REST_Y + CAP_HEIGHT / 2; // 1.575

/**
 * Vertical centre of the whole assembly, given how far the cap has lifted.
 *
 * The camera aims here rather than at a fixed height, which matters because
 * the frame gets genuinely tight: at the closest specified camera position
 * (z = 4) the frustum is ~2.6 units tall and the bottle spans 2.375 at rest
 * and 2.875 with the cap fully raised. Aiming at the subject's midpoint is
 * the provably optimal choice — it is the only aim that splits the available
 * headroom evenly, so if the subject fits at all, it fits this way. It also
 * means the aim rises on its own as the cap lifts, with no separate tilt
 * constant to keep in sync.
 */
export function subjectCenterY(capProgress: number): number {
  const crownY = CAP_CROWN_REST_Y + 0.5 * capProgress;
  return (crownY + BODY_BOTTOM_Y) / 2;
}

export const LABEL_WIDTH = 0.7;
export const LABEL_HEIGHT = 0.9;
export const LABEL_CENTER_Y = -0.1;
/**
 * How far the label sits off the glass — the brief's "radius + 0.001".
 *
 * 0.001 is too tight to survive depth-buffer precision at these camera
 * distances: the label's lower edge visibly serrated where it grazed the
 * glass surface. 0.012 is still invisibly thin at any framing in the scroll
 * sequence and it renders cleanly.
 */
export const LABEL_SURFACE_OFFSET = 0.012;
/** Horizontal tessellation — needed so the label can be bent, not faceted. */
export const LABEL_SEGMENTS = 48;
/**
 * Vertical tessellation. The bottle's radius changes over the label's height
 * (it crosses the waist), so the label needs vertical subdivisions to follow
 * that curve. With 1 segment the edges lifted away from the glass.
 */
export const LABEL_HEIGHT_SEGMENTS = 12;

/* ------------------------------------------------------------------ *
 * Geometry builders
 * ------------------------------------------------------------------ */

/**
 * Resample KEY_PROFILE into a dense, smooth point list.
 * Radius is clamped at 0 because Catmull-Rom can overshoot very slightly
 * where the base disc meets the centreline, and a negative radius would
 * invert those faces.
 */
export function buildProfilePoints(samples = PROFILE_SAMPLES): THREE.Vector2[] {
  const curve = new THREE.SplineCurve(
    KEY_PROFILE.map(([radius, y]) => new THREE.Vector2(radius, y)),
  );

  return curve.getPoints(samples).map((point) => new THREE.Vector2(Math.max(point.x, 0), point.y));
}

/**
 * The glass body.
 *
 * Note there is deliberately no computeVertexNormals() call here.
 * LatheGeometry already derives exact analytic normals from the profile's
 * tangents; recomputing them from face averages is strictly worse, and at the
 * degenerate centre point of the base disc (radius 0, where all 64 segments
 * converge) it produced a visible radial starburst through the refracting
 * glass base.
 */
export function buildBodyGeometry(profile: THREE.Vector2[]): THREE.LatheGeometry {
  return new THREE.LatheGeometry(profile, LATHE_SEGMENTS);
}

/**
 * Linear-interpolated glass radius at an arbitrary height. Used to size the
 * liquid and to bend the label so it hugs the real surface instead of an
 * approximate cylinder.
 */
export function radiusAtY(profile: THREE.Vector2[], y: number): number {
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

/**
 * The amber liquid: the same lathe profile scaled to 96% of the glass radius
 * at every height sample, truncated at LIQUID_TOP_Y and closed with a flat
 * meniscus disc. Because it reuses the body's curve it inherits the waist,
 * so the liquid silhouette tracks the glass exactly — a separate cylinder
 * here would show a visible mismatch through the refracting front wall.
 */
export function buildLiquidGeometry(profile: THREE.Vector2[]): THREE.LatheGeometry {
  const floorY = BODY_BOTTOM_Y + LIQUID_FLOOR_EPSILON;
  const points: THREE.Vector2[] = [new THREE.Vector2(0, floorY)];

  for (const point of profile) {
    if (point.y <= floorY) continue;
    if (point.y >= LIQUID_TOP_Y) break;
    points.push(new THREE.Vector2(point.x * LIQUID_RADIUS_SCALE, point.y));
  }

  // Meniscus: full-radius rim, then back to the centreline to cap the surface.
  const rim = radiusAtY(profile, LIQUID_TOP_Y) * LIQUID_RADIUS_SCALE;
  points.push(new THREE.Vector2(rim, LIQUID_TOP_Y));
  points.push(new THREE.Vector2(0, LIQUID_TOP_Y));

  // As with the body: LatheGeometry's own normals are analytic and correct.
  return new THREE.LatheGeometry(points, LATHE_SEGMENTS);
}

/**
 * The label, bent to follow the bottle's actual curvature.
 *
 * A flat plane tangent to a curved glass wall leaves visible gaps at its
 * left and right edges. Instead every vertex is wrapped around the local
 * radius sampled at that vertex's own height, so the label is a true
 * surface-offset patch that hugs the waist. Arc length is preserved, so the
 * label is still 0.7 units of printed width — it is wrapped, not stretched.
 *
 * Returned geometry is in body space with the apex at local z = 0, so the
 * mesh itself is positioned at [0, LABEL_CENTER_Y, labelZ].
 */
export function buildLabelGeometry(
  profile: THREE.Vector2[],
  labelZ: number,
): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(
    LABEL_WIDTH,
    LABEL_HEIGHT,
    LABEL_SEGMENTS,
    LABEL_HEIGHT_SEGMENTS,
  );
  const position = geometry.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);

    const radius = radiusAtY(profile, y + LABEL_CENTER_Y) + LABEL_SURFACE_OFFSET;
    const theta = x / radius; // arc length -> angle, so width is preserved

    position.setX(i, radius * Math.sin(theta));
    position.setZ(i, radius * Math.cos(theta) - labelZ);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Where the label plane sits on the z axis.
 *
 * NOTE — the brief gives a literal z of 0.56 but also states the rule
 * "at radius + 0.001". Those disagree: the lathe's radius at y = -0.1 is
 * ~0.617, so 0.56 would bury the label inside the glass wall and, worse,
 * partly inside the liquid. The stated rule is the governing intent, so the
 * offset is computed from the real profile instead of hard-coded.
 */
export function labelZAtCenter(profile: THREE.Vector2[]): number {
  return radiusAtY(profile, LABEL_CENTER_Y) + LABEL_SURFACE_OFFSET;
}
