import { create } from 'zustand';

import { DEFAULT_COLORWAY, type ColorwayId } from '../config/product';

/**
 * The single bridge between the DOM/GSAP world and the React Three Fiber world.
 *
 * GSAP's ScrollTrigger owns native scroll and writes `progress` here on every
 * update. Everything inside the <Canvas> reads it imperatively inside useFrame
 * (via `getSceneState()`), never as a reactive selector — that keeps the R3F
 * tree from re-rendering 60x a second while scrolling.
 */
export interface BagItem {
  colorway: ColorwayId;
  size: string;
}

export interface SceneState {
  /** Story scroll progress, 0 -> 1 across the 3D chapters. */
  progress: number;
  /** Normalised pointer position, -1 -> 1 on each axis. */
  pointer: { x: number; y: number };
  /** True once the model + HDR have loaded and real frames have been drawn. */
  assetsReady: boolean;
  /** False once the story has scrolled away — the canvas stops rendering. */
  storyActive: boolean;
  colorway: ColorwayId;
  size: string | null;
  bag: BagItem[];

  setProgress: (progress: number) => void;
  setPointer: (x: number, y: number) => void;
  setAssetsReady: (ready: boolean) => void;
  setStoryActive: (active: boolean) => void;
  setColorway: (colorway: ColorwayId) => void;
  setSize: (size: string | null) => void;
  addToBag: (item: BagItem) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  progress: 0,
  pointer: { x: 0, y: 0 },
  assetsReady: false,
  storyActive: true,
  colorway: DEFAULT_COLORWAY,
  size: null,
  bag: [],

  setProgress: (progress) => set({ progress }),
  setPointer: (x, y) => set({ pointer: { x, y } }),
  setAssetsReady: (assetsReady) => set({ assetsReady }),
  setStoryActive: (storyActive) => set({ storyActive }),
  setColorway: (colorway) => set({ colorway }),
  setSize: (size) => set({ size }),
  addToBag: (item) => set((state) => ({ bag: [...state.bag, item] })),
}));

/** Non-reactive read, for use inside useFrame. */
export const getSceneState = useSceneStore.getState;
