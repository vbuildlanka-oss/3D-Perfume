import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

/**
 * Lenis for wheel/trackpad smoothing, driven off GSAP's ticker so the
 * scroll position and every ScrollTrigger update on the same frame.
 *
 * Touch scrolling stays native (Lenis' default): momentum on iOS/Android
 * already feels right, and fighting it feels worse than not smoothing.
 * Under prefers-reduced-motion Lenis is not created at all.
 */
export function useSmoothScroll(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const instance = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9 });
    lenis = instance;

    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      lenis = null;
    };
  }, [enabled]);
}

/** Scroll to an element or a pixel offset — smooth when Lenis is running. */
export function scrollToTarget(target: HTMLElement | number, offset = 0): void {
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.6 });
    return;
  }
  const top =
    typeof target === 'number' ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + offset, behavior: 'auto' });
}
