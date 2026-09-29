import { useEffect, useState } from 'react';

export const MOBILE_BREAKPOINT = 768;

export interface EnvironmentFlags {
  /** window.innerWidth < 768 */
  isMobile: boolean;
  /** prefers-reduced-motion: reduce */
  reducedMotion: boolean;
}

function read(): EnvironmentFlags {
  if (typeof window === 'undefined') {
    return { isMobile: false, reducedMotion: false };
  }
  return {
    isMobile: window.innerWidth < MOBILE_BREAKPOINT,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

/**
 * Drives every performance / accessibility downgrade in the scene:
 *   isMobile       -> 15 bokeh particles, no chromatic aberration, dpr [1,1.5],
 *                     camera travel shortened by 40%
 *   reducedMotion  -> no idle auto-rotation, no mouse parallax, no bob,
 *                     linear scroll-tied camera moves only
 *
 * Both are matchMedia-driven so a rotation or an OS accessibility toggle is
 * picked up live, without a reload.
 */
export function useEnvironmentFlags(): EnvironmentFlags {
  const [flags, setFlags] = useState<EnvironmentFlags>(read);

  useEffect(() => {
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const update = () => {
      setFlags((prev) => {
        const next = read();
        // Avoid re-rendering the whole Canvas tree on every resize tick.
        if (prev.isMobile === next.isMobile && prev.reducedMotion === next.reducedMotion) {
          return prev;
        }
        return next;
      });
    };

    mobileQuery.addEventListener('change', update);
    motionQuery.addEventListener('change', update);
    window.addEventListener('resize', update);

    return () => {
      mobileQuery.removeEventListener('change', update);
      motionQuery.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return flags;
}
