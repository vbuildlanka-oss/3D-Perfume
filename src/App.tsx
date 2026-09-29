import { useEffect } from 'react';

import { BackgroundLayers } from './components/BackgroundLayers';
import { LoadingScreen } from './components/LoadingScreen';
import { Scene } from './components/Scene';
import { ScrollSections } from './components/ScrollSections';
import { AfterStory } from './components/site/AfterStory';
import { ChapterCounter, ChapterRail } from './components/site/ChapterRail';
import { SiteHeader } from './components/site/SiteHeader';
import { getColorway } from './config/product';
import { useEnvironmentFlags } from './hooks/useEnvironmentFlags';
import { usePointerParallax } from './hooks/usePointerParallax';
import { useSmoothScroll } from './hooks/useSmoothScroll';
import { useSceneStore } from './store/useSceneStore';

/**
 * If the model or HDR never resolve (offline, blocked, no WebGL), reveal the
 * page anyway — every word of it still works without the 3D.
 */
const LOADER_TIMEOUT_MS = 15000;

const hexToRgbChannels = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};

export default function App() {
  const { isMobile, reducedMotion } = useEnvironmentFlags();
  const assetsReady = useSceneStore((s) => s.assetsReady);
  const colorway = useSceneStore((s) => s.colorway);

  usePointerParallax(!reducedMotion && !isMobile);
  useSmoothScroll(!reducedMotion);

  // The page accent follows the shoe.
  useEffect(() => {
    const c = getColorway(colorway);
    const root = document.documentElement.style;
    root.setProperty('--accent', c.accent);
    root.setProperty('--accent-rgb', hexToRgbChannels(c.accent));
    root.setProperty('--accent-tint', c.tint);
  }, [colorway]);

  useEffect(() => {
    if (assetsReady) return;
    const t = window.setTimeout(
      () => useSceneStore.getState().setAssetsReady(true),
      LOADER_TIMEOUT_MS,
    );
    return () => window.clearTimeout(t);
  }, [assetsReady]);

  // Keep the user at the top on reload; the story reads best from the start.
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  }, []);

  return (
    <div id="top">
      {/* z-0/1/2 — paper wash, wordmark + grid, floor */}
      <BackgroundLayers />

      {/* z-10 — fixed, transparent WebGL canvas */}
      <Scene isMobile={isMobile} reducedMotion={reducedMotion} />

      {/* z-20 — the seven-chapter story, then the rest of the site */}
      <ScrollSections reducedMotion={reducedMotion} />
      <AfterStory />

      {/* z-30/40 — navigation chrome */}
      <ChapterRail />
      <ChapterCounter />
      <SiteHeader />

      <LoadingScreen ready={assetsReady} />
    </div>
  );
}
