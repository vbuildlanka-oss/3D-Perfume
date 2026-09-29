import { create } from 'zustand';

/**
 * The single bridge between the DOM/GSAP world and the React Three Fiber world.
 *
 * GSAP's ScrollTrigger owns native scroll and writes `progress` here on every
 * update. Everything inside the <Canvas> reads it imperatively inside useFrame
 * (via `useSceneStore.getState()`), never as a reactive selector — that keeps
 * the R3F tree from re-rendering 60x/second while scrolling.
 */
export interface SceneState {
  /** Master scroll progress, 0 -> 1 across the whole 500vh page. */
  progress: number;
  /** Normalised pointer position, -1 -> 1 on each axis. */
  pointer: { x: number; y: number };
  /** Flips true once the environment map + label font have loaded AND the
   *  first real frames have been rendered. Drives the loading screen fade. */
  assetsReady: boolean;

  setProgress: (progress: number) => void;
  setPointer: (x: number, y: number) => void;
  setAssetsReady: (ready: boolean) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  progress: 0,
  pointer: { x: 0, y: 0 },
  assetsReady: false,

  setProgress: (progress) => set({ progress }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setAssetsReady: (assetsReady) => set({ assetsReady }),
}));

/** Non-reactive read, for use inside useFrame. */
export const getSceneState = useSceneStore.getState;
