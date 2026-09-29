import * as React from 'react';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Environment } from '@react-three/drei';
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';

import { BottleModel } from './BottleModel';
import { CanvasResizeHandler } from '../hooks/useCanvasResize';
import { LIGHT_GELS } from '../config/palette';
import { getSceneState } from '../store/useSceneStore';
import { getCameraKeyframes, getCapProgress, sampleCameraPath } from '../config/scrollSequence';
import { subjectCenterY } from '../config/bottleProfile';

/**
 * The camera always aims at the vertical centre of the bottle assembly, which
 * rises as the cap lifts — see subjectCenterY(). scripts/validate-framing.mjs
 * verifies that this keeps the base and the cap crown inside the frustum at
 * every point in the sequence, including the tight closest approach at z = 4.
 */

/* ================================================================== *
 * CAMERA RIG
 *
 * The camera is a pure function of scroll progress. Nothing here holds
 * tween state, which is what makes the whole sequence scrub identically
 * whether you are scrolling down, scrolling up, or dragging the scrollbar.
 * ================================================================== */
function CameraRig({ isMobile, reducedMotion }: { isMobile: boolean; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera);
  const keyframes = useMemo(() => getCameraKeyframes(isMobile), [isMobile]);
  const target = useRef(new THREE.Vector3());
  const lookAt = useRef(new THREE.Vector3());

  useFrame(() => {
    const { progress } = getSceneState();

    // `linear` strips the per-segment smoothstep for prefers-reduced-motion.
    sampleCameraPath(keyframes, progress, reducedMotion, target.current);

    // Direct assignment, not a lerp: ScrollTrigger's `scrub: 1` has already
    // smoothed `progress` for us. Damping again on top would only add lag and
    // make the bottle feel like it was trailing the scroll.
    camera.position.copy(target.current);

    // Aim tracks the subject's centre, so the frame follows the cap up.
    lookAt.current.set(0, subjectCenterY(getCapProgress(progress)), 0);
    camera.lookAt(lookAt.current);
  });

  return null;
}

/* ================================================================== *
 * ENVIRONMENT
 *
 * drei's `preset` prop hard-overrides the load path to a third-party CDN
 * (raw.githack.com), which is not something a production deploy should
 * depend on — and the env map is exactly what makes the glass look like
 * glass, so losing it is a visible failure, not a graceful one.
 *
 * So: use the preset as specified, but catch a failed load and fall back
 * to a byte-identical self-hosted copy of the same HDR.
 * ================================================================== */
const ENV_INTENSITY = 0.6;
const SELF_HOSTED_HDR = '/hdri/studio_small_03_1k.hdr';

class EnvironmentFallback extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn(
      '[NOIR AMBRE] studio preset failed to load from the drei CDN; ' +
        'falling back to the self-hosted HDR.',
      error,
    );
  }

  render() {
    if (this.state.failed) {
      return <Environment files={SELF_HOSTED_HDR} environmentIntensity={ENV_INTENSITY} />;
    }
    return this.props.children;
  }
}

/* ================================================================== *
 * READY SIGNAL
 *
 * Mounted inside <Suspense>, so it cannot run until the environment map
 * and the label font have actually resolved. We then wait a few frames so
 * the transmission buffers are populated before revealing the scene —
 * fading out on frame 1 would show the glass mid-solve.
 * ================================================================== */
const FRAMES_BEFORE_READY = 3;

function ReadySignal() {
  const frames = useRef(0);

  useFrame(() => {
    if (frames.current > FRAMES_BEFORE_READY) return;
    frames.current += 1;
    if (frames.current === FRAMES_BEFORE_READY) {
      getSceneState().setAssetsReady(true);
    }
  });

  return null;
}

export interface SceneProps {
  isMobile: boolean;
  reducedMotion: boolean;
}

export function Scene({ isMobile, reducedMotion }: SceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 6], fov: 35 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
      }}
      // Mobile is capped lower: MeshTransmissionMaterial is fill-rate bound,
      // and a 3x DPR phone would be rendering the transmission buffer twice
      // at retina resolution.
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      shadows
      // Fixed and z-10: above the three DOM background layers (z 0/1/2),
      // below the foreground copy (z-20). Transparent, so those layers show
      // through — which is also why the glass needs an explicit
      // `background` colour to refract. See BottleModel.
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 10 }}
    >
      <CanvasResizeHandler />
      <CameraRig isMobile={isMobile} reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <ReadySignal />

        {/* --- LIGHTING ------------------------------------------------ *
            Studio IBL for the glass to refract, plus two explicit
            directionals. The rim light is doing the heavy lifting: without
            it the glass silhouette dissolves into the near-black page.    */}
        <EnvironmentFallback>
          <Environment preset="studio" environmentIntensity={ENV_INTENSITY} />
        </EnvironmentFallback>

        {/* Key light — warm white, upper front right. */}
        <directionalLight
          position={[3, 5, 4]}
          intensity={2.2}
          color={LIGHT_GELS.key}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0005}
          shadow-camera-near={0.5}
          shadow-camera-far={14}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />

        {/* Cool rim light — edge separation against the dark background. */}
        <directionalLight position={[-4, 1, -3]} intensity={0.6} color={LIGHT_GELS.rim} />

        {/* --- SUBJECT ------------------------------------------------- */}
        <BottleModel isMobile={isMobile} reducedMotion={reducedMotion} />

        {/* --- GROUNDING ----------------------------------------------- *
            Sits below the bottle's base (-0.8), so the bottle reads as
            floating above its own shadow rather than resting on a floor.  */}
        <ContactShadows position={[0, -1.4, 0]} opacity={0.5} scale={8} blur={2.4} far={2} />

        {/* --- POST ---------------------------------------------------- *
            Restrained on purpose: bloom to let the gold cap and the
            specular hits glow, and a vignette to pull focus. Nothing else
            — no extra chromatic aberration pass, no film grain.           */}
        <EffectComposer
          multisampling={isMobile ? 0 : 4}
          // HalfFloat keeps bloom highlights from clipping before ACES
          // tone-mapping gets to them.
          frameBufferType={THREE.HalfFloatType}
        >
          <Bloom luminanceThreshold={0.5} intensity={0.4} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.6} />
        </EffectComposer>
      </Suspense>
    </Canvas>
  );
}
