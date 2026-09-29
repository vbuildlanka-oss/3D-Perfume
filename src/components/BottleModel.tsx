import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Text } from '@react-three/drei';

import { getSceneState } from '../store/useSceneStore';
import { PALETTE } from '../config/palette';
import { createStudioBackdropTexture } from '../config/studioBackdrop';
import {
  CAP_HEIGHT,
  CAP_RADIUS,
  CAP_REST_Y,
  LABEL_CENTER_Y,
  NECK_HEIGHT,
  NECK_RADIUS_BOTTOM,
  NECK_RADIUS_TOP,
  NECK_Y,
  buildBodyGeometry,
  buildLabelGeometry,
  buildLiquidGeometry,
  buildProfilePoints,
  labelZAtCenter,
} from '../config/bottleProfile';
import {
  CAP_LIFT_HEIGHT,
  CAP_LIFT_ROTATION,
  SECTION_STEP,
  clamp01,
  getCapProgress,
  invLerp,
  smoothstep,
} from '../config/scrollSequence';

/* ================================================================== *
 * IDLE MOTION CONSTANTS
 * ================================================================== */

/** Continuous turntable spin: 0.05 rad/s -> one revolution every ~126s. */
const IDLE_SPIN_SPEED = 0.05;
/** Mouse-parallax tilt limits, in radians. */
const PARALLAX_TILT_X = 0.08;
const PARALLAX_TILT_Y = 0.12;
/**
 * Lerp factor per frame at 60fps. Deliberately tiny — the bottle should feel
 * like it has mass. See `frameLerp` for why this is not applied raw.
 */
const PARALLAX_LERP = 0.04;
/** Vertical bob. */
const BOB_SPEED = 0.4;
const BOB_AMPLITUDE = 0.04;

const TWO_PI = Math.PI * 2;

/**
 * Opt-in debug handle, enabled with `?debug` on the URL.
 *
 * Publishes the bottle's live transform on `window.__NOIR_DEBUG__` so the
 * motion rules (idle spin, pointer tilt, bob, cap lift) can be asserted
 * numerically from a headless browser. Screenshot diffing cannot do this job:
 * the DOM bokeh layer animates independently, so pixels always differ even
 * when the 3D scene is correctly frozen. Costs one boolean test per frame when
 * off, and nothing is attached to window at all.
 */
const DEBUG =
  typeof window !== 'undefined' && window.location.search.includes('debug');

/**
 * Frame-rate-normalised lerp.
 *
 * A raw `lerp(a, b, 0.04)` per frame is twice as fast on a 120Hz display as on
 * a 60Hz one, which would make the "viscous" feel of the parallax completely
 * different machine to machine. This converts the intended 0.04-at-60fps into
 * the equivalent factor for whatever delta we actually got.
 */
function frameLerp(factor: number, delta: number): number {
  return 1 - Math.pow(1 - factor, Math.min(delta, 0.1) * 60);
}

export interface BottleModelProps {
  isMobile: boolean;
  reducedMotion: boolean;
}

export function BottleModel({ isMobile, reducedMotion }: BottleModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  /** Separate ref so the cap can lift and twist independently of the body. */
  const capRef = useRef<THREE.Mesh>(null);

  /** Turntable angle, accumulated. */
  const spinRef = useRef(0);
  /** Current (lerped) parallax contributions, kept apart from the spin so the
   *  two can be summed without the parallax fighting the accumulating angle. */
  const parallaxYRef = useRef(0);
  const parallaxXRef = useRef(0);

  /* ---------------------------------------------------------------- *
   * GEOMETRY — built once, from primitives. No model files.
   * ---------------------------------------------------------------- */
  const { bodyGeometry, liquidGeometry, labelGeometry, neckGeometry, capGeometry, labelZ } =
    useMemo(() => {
      const profile = buildProfilePoints();
      const z = labelZAtCenter(profile);

      return {
        bodyGeometry: buildBodyGeometry(profile),
        liquidGeometry: buildLiquidGeometry(profile),
        labelGeometry: buildLabelGeometry(profile, z),
        neckGeometry: new THREE.CylinderGeometry(
          NECK_RADIUS_TOP,
          NECK_RADIUS_BOTTOM,
          NECK_HEIGHT,
          32,
        ),
        capGeometry: new THREE.CylinderGeometry(CAP_RADIUS, CAP_RADIUS, CAP_HEIGHT, 32),
        labelZ: z,
      };
    }, []);

  /**
   * What the glass refracts.
   *
   * The canvas is transparent so the DOM parallax layers show through, which
   * means the 3D scene has nothing behind the bottle for the transmission
   * buffer to sample — left alone, the glass refracts empty alpha and reads
   * as flat black. This ramp is the lightbox the bottle is standing in; it is
   * only ever swapped in for the transmission pass. See studioBackdrop.ts.
   */
  const transmissionBackground = useMemo(() => createStudioBackdropTexture(), []);

  /**
   * Everything above is constructed imperatively, so React will not free any
   * of it for us — these are GPU buffers, not JS objects. Dispose on unmount
   * so hot reloads during tuning do not steadily leak VRAM.
   */
  useEffect(
    () => () => {
      bodyGeometry.dispose();
      liquidGeometry.dispose();
      labelGeometry.dispose();
      neckGeometry.dispose();
      capGeometry.dispose();
      transmissionBackground.dispose();
    },
    [
      bodyGeometry,
      liquidGeometry,
      labelGeometry,
      neckGeometry,
      capGeometry,
      transmissionBackground,
    ],
  );

  /* ---------------------------------------------------------------- *
   * PER-FRAME: idle motion + scroll-driven cap
   * ---------------------------------------------------------------- */
  useFrame((state, delta) => {
    const group = groupRef.current;
    const cap = capRef.current;
    if (!group) return;

    const { progress, pointer } = getSceneState();

    /**
     * Hero weight fades the *decorative* idle motion out as soon as the user
     * starts scrolling — by the time section 2 is on screen the bottle is
     * fully under the scroll sequence's control, so the bob and the pointer
     * tilt do not compete with the camera move.
     */
    const heroWeight = 1 - clamp01(progress / SECTION_STEP);

    /**
     * Settle weight ramps up across section 5 so the turntable eases to a stop
     * and the label rotates to face front for the final CTA shot. Without this
     * the closing frame lands on whatever arbitrary angle the spin happened to
     * reach, which is not a product hero shot.
     */
    const settleWeight = smoothstep(invLerp(0.75, 1.0, progress));

    if (!reducedMotion) {
      // --- Continuous turntable -----------------------------------------
      // Spin winds down as the settle takes over, so the two never fight.
      spinRef.current += IDLE_SPIN_SPEED * delta * (1 - settleWeight);

      // --- Mouse parallax ------------------------------------------------
      // Viscous, never twitchy: a very low lerp factor, normalised for fps.
      const lerpAmount = frameLerp(PARALLAX_LERP, delta);
      parallaxXRef.current = THREE.MathUtils.lerp(
        parallaxXRef.current,
        pointer.y * PARALLAX_TILT_X * heroWeight,
        lerpAmount,
      );
      parallaxYRef.current = THREE.MathUtils.lerp(
        parallaxYRef.current,
        pointer.x * PARALLAX_TILT_Y * heroWeight,
        lerpAmount,
      );

      // --- Gentle vertical bob -------------------------------------------
      group.position.y =
        Math.sin(state.clock.elapsedTime * BOB_SPEED) * BOB_AMPLITUDE * heroWeight;
    } else {
      // prefers-reduced-motion: no spin, no tilt, no bob. Dead still.
      spinRef.current = 0;
      parallaxXRef.current = 0;
      parallaxYRef.current = 0;
      group.position.y = 0;
    }

    group.rotation.x = parallaxXRef.current;

    /**
     * Settle the turntable to a label-front-and-centre finish.
     *
     * This blends toward the nearest whole revolution by `settleWeight`
     * instead of easing toward it frame by frame. That distinction matters:
     * an asymptotic lerp only *approaches* front-on, so how square the final
     * hero shot looks would depend on the frame rate and on how fast the user
     * scrolled. Blending by scroll position is exact — at p = 1 the label is
     * dead centre on every machine, and it is still fully reversible on scrub.
     */
    const settledY = Math.round(spinRef.current / TWO_PI) * TWO_PI;
    group.rotation.y =
      THREE.MathUtils.lerp(spinRef.current, settledY, settleWeight) + parallaxYRef.current;

    /* -------------------------------------------------------------- *
     * CAP LIFT — driven purely by scroll progress, so it scrubs
     * identically in both directions. See getCapProgress().
     * -------------------------------------------------------------- */
    if (cap) {
      const capProgress = getCapProgress(progress);
      cap.position.y = CAP_REST_Y + CAP_LIFT_HEIGHT * capProgress;
      cap.rotation.y = CAP_LIFT_ROTATION * capProgress;
    }

    if (DEBUG) {
      (window as unknown as Record<string, unknown>).__NOIR_DEBUG__ = {
        progress,
        heroWeight,
        settleWeight,
        groupRotationX: group.rotation.x,
        groupRotationY: group.rotation.y,
        groupPositionY: group.position.y,
        capPositionY: cap?.position.y ?? null,
        capRotationY: cap?.rotation.y ?? null,
        capProgress: getCapProgress(progress),
        cameraPosition: state.camera.position.toArray(),
        reducedMotion,
        isMobile,
      };
    }
  });

  return (
    <group ref={groupRef} name="BottleGroup">
      {/* ============================================================ *
          BODY — LatheGeometry, 64 radial segments, gentle hourglass.
          ============================================================ */}
      <mesh geometry={bodyGeometry} position={[0, 0, 0]} castShadow>
        {/* ---------------------------------------------------------- *
            MATERIAL: GLASS (body)
            Hand-tune here. Values from the brief are marked [spec].
            ---------------------------------------------------------- */}
        <MeshTransmissionMaterial
          transmission={1} //          [spec] fully transmissive
          roughness={0.04} //          [spec] near-polished; >0.1 goes frosted fast
          thickness={0.6} //           [spec] refraction depth
          ior={1.5} //                 [spec] soda-lime glass
          chromaticAberration={isMobile ? 0 : 0.02} // [spec] 0.02; off on mobile for fill-rate
          clearcoat={1} //             [spec]
          clearcoatRoughness={0.03} // [spec]
          color={'#f0ede6'} //         [spec] faint warm tint in the glass itself
          envMapIntensity={1.2} //     [spec]
          /* --- below are quality knobs, not look knobs --- */
          samples={isMobile ? 4 : 10} //      blur samples for the transmission blur
          resolution={isMobile ? 512 : 1024} // transmission buffer size
          /* backside is deliberately OFF. The lathe is a solid volume of glass
             ~0.62 units across, so a second refraction pass turned the whole
             body into a thick lens and focused the studio HDR's softbox into
             one blown-out white column down the centre of the bottle. Single-
             sided refraction against the gradient backdrop is both cheaper and
             far more convincing here. Turn it on only if you also drop
             `thickness` well below 0.2. */
          backside={false}
          background={transmissionBackground}
          anisotropicBlur={0.1} //            slight directional softening
          distortion={0} //                   no surface warp; the lathe does the work
          temporalDistortion={0}
          attenuationDistance={2.2} //        how fast the glass tints with depth
          attenuationColor={'#f0ede6'}
        />
      </mesh>

      {/* ============================================================ *
          NECK — same glass, cheaper buffer (it is small and mostly
          occluded by the cap, so a 1024 buffer here is wasted).
          ============================================================ */}
      <mesh geometry={neckGeometry} position={[0, NECK_Y, 0]}>
        {/* ---------------------------------------------------------- *
            MATERIAL: GLASS (neck) — same look, reduced sampling.
            ---------------------------------------------------------- */}
        <MeshTransmissionMaterial
          transmission={1}
          roughness={0.04}
          thickness={0.6}
          ior={1.5}
          chromaticAberration={isMobile ? 0 : 0.02}
          clearcoat={1}
          clearcoatRoughness={0.03}
          color={'#f0ede6'}
          envMapIntensity={1.2}
          samples={isMobile ? 2 : 6}
          resolution={isMobile ? 128 : 256}
          backside={false}
          background={transmissionBackground}
          attenuationDistance={2.2}
          attenuationColor={'#f0ede6'}
        />
      </mesh>

      {/* ============================================================ *
          CAP — own ref so the scroll sequence can lift and twist it.
          ============================================================ */}
      <mesh ref={capRef} geometry={capGeometry} position={[0, CAP_REST_Y, 0]} castShadow>
        {/* ---------------------------------------------------------- *
            MATERIAL: GOLD CAP
            metalness 0.95 + roughness 0.28 = brushed, not mirror.
            Drop roughness toward 0.1 for a polished-gold look.
            ---------------------------------------------------------- */}
        <meshStandardMaterial
          color={PALETTE.accentGold} // [spec] --accent-gold #c9a668
          metalness={0.95} //           [spec]
          roughness={0.28} //           [spec]
          envMapIntensity={1.4} //      [spec]
        />
      </mesh>

      {/* ============================================================ *
          LIQUID — body profile at 96% radius, flat meniscus, headspace
          above. Rendered after the glass so it sits inside it.
          ============================================================ */}
      <mesh geometry={liquidGeometry}>
        {/* ---------------------------------------------------------- *
            MATERIAL: AMBER LIQUID
            Lower ior than the glass (1.35) so the two surfaces refract
            differently and the liquid line stays visible.
            ---------------------------------------------------------- */}
        <meshPhysicalMaterial
          color={PALETTE.liquidAmber} // [spec] --liquid-amber #b8863f
          transmission={0.85} //         [spec]
          roughness={0.15} //            [spec]
          thickness={0.4} //             [spec]
          ior={1.35} //                  [spec]
          /* --- supporting values --- */
          metalness={0}
          attenuationDistance={1.4} //   deepens the amber toward the base
          attenuationColor={PALETTE.liquidAmber}
          envMapIntensity={1}
          /* A transmissive volume can only show you what is behind it, and on
             this page what is behind it is a near-black backdrop — so without
             a little self-emission the amber reads as dead black. This is the
             standard product-viz cheat for a lit fragrance: the liquid carries
             its own glow, and Bloom (threshold 0.5) lifts it just enough to
             look backlit. Raise toward 0.5 for a hotter, more "lamp-like"
             liquid; drop to 0 for a strictly physical result. */
          emissive={PALETTE.liquidAmber}
          emissiveIntensity={0.22}
        />
      </mesh>

      {/* ============================================================ *
          LABEL — bent to the glass curvature, wordmark rendered in 3D.
          ============================================================ */}
      <mesh geometry={labelGeometry} position={[0, LABEL_CENTER_Y, labelZ]}>
        {/* ---------------------------------------------------------- *
            MATERIAL: LABEL STOCK
            Matte near-black card. roughness 0.6 keeps it from competing
            with the glass highlights.
            ---------------------------------------------------------- */}
        {/* meshPhysicalMaterial rather than meshStandardMaterial: it is a
            strict superset, so every specified value below is unchanged, but
            it exposes `specularIntensity`, which is the knob this label
            actually needed. At roughness 0.6 / metalness 0.1 the 2.2-intensity
            key light threw a broad specular lobe across the entire panel and
            the near-black stock rendered as mid-grey — it looked like a
            sticker instead of the matte card the palette asks for. */}
        <meshPhysicalMaterial
          color={PALETTE.bgElevated} // [spec] --bg-elevated #14110f
          roughness={0.6} //            [spec]
          metalness={0.1} //            [spec]
          specularIntensity={0.15} //   tames the key-light sheen; 1 = default
          envMapIntensity={0.25} //     and the same for the studio softbox
          side={THREE.DoubleSide}
          /* Nudges the label toward the viewer in the depth test only, so it
             can never fight with the glass surface it is sitting on. */
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />

        {/* Wordmark, rendered with the real Cormorant Garamond italic face.
            Self-hosted so it is available offline and never blocks on a
            third-party font CDN. */}
        <Text
          font="/fonts/CormorantGaramond-Italic.woff"
          fontSize={0.09} //            [spec]
          color={PALETTE.accentGold} // [spec] --accent-gold
          letterSpacing={0.16}
          anchorX="center"
          anchorY="middle"
          position={[0, 0, 0.006]}
          // Keeps the text crisp when the camera pushes in during section 2.
          sdfGlyphSize={64}
        >
          NOIR AMBRE
          {/* ------------------------------------------------------------ *
              MATERIAL: FOIL-STAMPED WORDMARK
              Unlit and un-tone-mapped so the gold stays exactly
              --accent-gold and stays legible. A lit material here sat at
              a grazing angle to the key light and the wordmark vanished
              into the black label stock — and an illegible wordmark on the
              hero product is not a tuning issue, it is a broken feature.
              Being above Bloom's 0.5 threshold also gives it a faint
              foil shimmer as the bottle turns.
              ------------------------------------------------------------ */}
          <meshBasicMaterial color={PALETTE.accentGold} toneMapped={false} />
        </Text>
      </mesh>

    </group>
  );
}
