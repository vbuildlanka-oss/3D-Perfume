import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Keeps the drawing buffer honest on mobile.
 *
 * A plain `window.resize` listener misses the most common mobile viewport
 * change there is: Safari/Chrome collapsing or revealing their browser chrome
 * mid-scroll. That changes the element's box without always firing a window
 * resize, which leaves the canvas stretched.
 *
 * So we observe the canvas's own container with a ResizeObserver (element box,
 * always correct) and additionally listen to visualViewport, which is the one
 * API that reports chrome show/hide directly.
 */
export function useCanvasResize(): void {
  const gl = useThree((state) => state.gl);
  const setSize = useThree((state) => state.setSize);

  useEffect(() => {
    const canvas = gl.domElement;
    const container = canvas.parentElement;
    if (!container) return;

    let frame = 0;

    const apply = () => {
      cancelAnimationFrame(frame);
      // Coalesce bursts of observer callbacks into one resize per frame.
      frame = requestAnimationFrame(() => {
        const { width, height } = container.getBoundingClientRect();
        if (width > 0 && height > 0) {
          // R3F recomputes camera.aspect and updates the projection matrix here.
          setSize(width, height);
        }
      });
    };

    const observer = new ResizeObserver(apply);
    observer.observe(container);

    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', apply);
    window.addEventListener('orientationchange', apply);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener('resize', apply);
      window.removeEventListener('orientationchange', apply);
    };
  }, [gl, setSize]);
}

/** Mountable form, so it can sit inside the <Canvas> tree declaratively. */
export function CanvasResizeHandler(): null {
  useCanvasResize();
  return null;
}
