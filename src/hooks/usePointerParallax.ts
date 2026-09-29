import { useEffect } from 'react';
import { useSceneStore } from '../store/useSceneStore';

/**
 * Tracks the pointer as a normalised -1 -> 1 vector and pushes it into the
 * store. Lives in the DOM (not in the Canvas) so it keeps working over the
 * text overlays, which are pointer-events-none but still sit above the canvas.
 *
 * No-op under prefers-reduced-motion: the pointer stays pinned at 0,0 so the
 * parallax tilt resolves to zero without the consumer needing a branch.
 */
export function usePointerParallax(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) {
      useSceneStore.getState().setPointer(0, 0);
      return;
    }

    const setPointer = useSceneStore.getState().setPointer;

    const onPointerMove = (event: PointerEvent) => {
      setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };

    // Drifting off-window should relax the shoe back to centre, not freeze it.
    const onPointerLeave = () => setPointer(0, 0);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', onPointerLeave);

    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [enabled]);
}
