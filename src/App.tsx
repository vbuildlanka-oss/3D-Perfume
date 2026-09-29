import { useEffect } from 'react';

import { BackgroundLayers } from './components/BackgroundLayers';
import { LoadingScreen } from './components/LoadingScreen';
import { Scene } from './components/Scene';
import { ScrollSections } from './components/ScrollSections';
import { useEnvironmentFlags } from './hooks/useEnvironmentFlags';
import { usePointerParallax } from './hooks/usePointerParallax';
import { useSceneStore } from './store/useSceneStore';

/**
 * Hard ceiling on the loading screen.
 *
 * `assetsReady` is normally flipped from inside the Canvas once the HDR and
 * the label font have resolved and a few frames have rendered. If both the
 * CDN preset *and* the self-hosted fallback fail — offline, blocked, WebGL
 * unavailable — nothing would ever flip it and the user would stare at a gold
 * ring forever. Better to reveal a partially-lit scene than to hang.
 */
const LOADER_TIMEOUT_MS = 12000;

export default function App() {
  const { isMobile, reducedMotion } = useEnvironmentFlags();
  const assetsReady = useSceneStore((state) => state.assetsReady);

  // Pointer parallax is a decorative motion effect, so reduced-motion kills it.
  usePointerParallax(!reducedMotion);

  useEffect(() => {
    if (assetsReady) return;
    const timer = window.setTimeout(() => {
      useSceneStore.getState().setAssetsReady(true);
    }, LOADER_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [assetsReady]);

  return (
    <>
      {/* z-0 / z-1 / z-2 — gradient, bokeh, vignette */}
      <BackgroundLayers isMobile={isMobile} />

      {/* z-10 — the WebGL canvas, fixed and transparent */}
      <Scene isMobile={isMobile} reducedMotion={reducedMotion} />

      {/* z-20 — 500vh of foreground copy; owns the master ScrollTrigger */}
      <ScrollSections reducedMotion={reducedMotion} />

      {/* z-50 — overlay until the first real frames are on screen */}
      <LoadingScreen ready={assetsReady} />
    </>
  );
}
