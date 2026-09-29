import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';

import { ShoeModel } from './ShoeModel';
import { CanvasResizeHandler } from '../hooks/useCanvasResize';
import { getSceneState, useSceneStore } from '../store/useSceneStore';
import {
  createSampledPose,
  distanceScaleForAspect,
  getChapters,
  samplePose,
} from '../config/scrollSequence';

/** Self-hosted, so the product never depends on a third-party CDN. */
const STUDIO_HDR = '/hdri/studio_small_03_1k.hdr';

/* ================================================================== *
 * CAMERA RIG — a pure function of scroll progress, plus a push-back on
 * narrow screens so the shoe always fits the width.
 * ================================================================== */
function CameraRig({ isMobile, reducedMotion }: { isMobile: boolean; reducedMotion: boolean }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const keyframes = useMemo(() => getChapters(isMobile), [isMobile]);
  const pose = useMemo(createSampledPose, []);

  useFrame(() => {
    samplePose(keyframes, getSceneState().progress, reducedMotion, pose);
    const aspect = size.width / Math.max(1, size.height);
    const push = distanceScaleForAspect(aspect, pose.camera.length());
    camera.position.copy(pose.camera).multiplyScalar(push);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

/* ================================================================== *
 * READY SIGNAL — mounted inside <Suspense>, so it only runs once the
 * model and HDR have resolved. Waits a few frames so the first thing the
 * user sees is a fully-shaded shoe, not shader compilation.
 * ================================================================== */
function ReadySignal() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) getSceneState().setAssetsReady(true);
  });
  return null;
}

export interface SceneProps {
  isMobile: boolean;
  reducedMotion: boolean;
}

export function Scene({ isMobile, reducedMotion }: SceneProps) {
  // Once the story has scrolled away the canvas is fully covered by the
  // rest of the page, so stop rendering it entirely.
  const storyActive = useSceneStore((state) => state.storyActive);

  return (
    <Canvas
      frameloop={storyActive ? 'always' : 'never'}
      camera={{ position: [0, 0.35, 6.4], fov: 35, near: 0.1, far: 60 }}
      gl={{
        antialias: true,
        alpha: true,
        // Khronos PBR Neutral: made for e-commerce. Keeps the colourways
        // true to their textures instead of ACES' warm, desaturated push.
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1.0,
      }}
      dpr={isMobile ? [1, 1.5] : [1, 2]}
      shadows="soft"
      // Transparent and fixed: the white page and its layers show through.
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 10 }}
    >
      <CanvasResizeHandler />
      <CameraRig isMobile={isMobile} reducedMotion={reducedMotion} />

      <Suspense fallback={null}>
        <ReadySignal />

        {/* --- LIGHT ------------------------------------------------------ *
            A studio HDR does the soft wrap; one key light gives the shoe a
            direction and a crisp edge along the midsole. Low ambient on
            purpose — the shadow side is what makes it look solid on white. */}
        <Environment files={STUDIO_HDR} environmentIntensity={0.85} />
        <directionalLight
          position={[3.5, 6, 4]}
          intensity={1.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
        />
        <directionalLight position={[-5, 2, -3]} intensity={0.5} />

        <ShoeModel isMobile={isMobile} reducedMotion={reducedMotion} />
      </Suspense>
    </Canvas>
  );
}
