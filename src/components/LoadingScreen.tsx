import { useEffect, useState } from 'react';

/** Must match the CSS transition duration below. */
const FADE_MS = 800;

export interface LoadingScreenProps {
  ready: boolean;
}

export function LoadingScreen({ ready }: LoadingScreenProps) {
  const [mounted, setMounted] = useState(true);

  useEffect(() => {
    if (!ready) return;
    // Unmount after the fade so the overlay is not left sitting in the DOM
    // on top of the canvas with pointer-events disabled but still composited.
    const timer = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        backgroundColor: 'var(--bg-base)',
        opacity: ready ? 0 : 1,
        filter: ready ? 'blur(12px)' : 'blur(0px)',
        transition: `opacity ${FADE_MS}ms ease, filter ${FADE_MS}ms ease`,
        pointerEvents: ready ? 'none' : 'auto',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading NOIR AMBRE"
    >
      {/* Thin gold ring. The dash pattern is animated in CSS (loader-dash),
          the whole ring counter-rotates (loader-spin). Both are disabled
          under prefers-reduced-motion — see index.css. */}
      <svg width="56" height="56" viewBox="0 0 56 56" className="loader-ring" aria-hidden="true">
        <circle
          className="loader-ring__track"
          cx="28"
          cy="28"
          r="26"
          fill="none"
          stroke="var(--accent-gold)"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </svg>

      <p
        className="mt-7 font-display italic text-2xl tracking-[0.12em]"
        style={{ color: 'var(--accent-gold)' }}
      >
        NOIR AMBRE
      </p>
    </div>
  );
}
