import { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';

import { BRAND } from '../config/product';

const FADE_MS = 700;

/** Rotates while we wait, so a slow connection gets something to read. */
const LINES = ['Lacing up', 'Finding the other sock', 'Stretching, briefly', 'Almost there'];

export function LoadingScreen({ ready }: { ready: boolean }) {
  const { progress } = useProgress();
  const [mounted, setMounted] = useState(true);
  const [line, setLine] = useState(0);

  useEffect(() => {
    if (ready) return;
    const t = window.setInterval(() => setLine((l) => (l + 1) % LINES.length), 1600);
    return () => window.clearInterval(t);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setMounted(false), FADE_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  if (!mounted) return null;

  // The model is most of the payload; hold at 96% until real frames are drawn.
  const shown = ready ? 100 : Math.min(96, Math.round(progress));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${BRAND.name}`}
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-paper"
      style={{
        opacity: ready ? 0 : 1,
        transform: ready ? 'translateY(-12px)' : 'none',
        transition: `opacity ${FADE_MS}ms ease, transform ${FADE_MS}ms cubic-bezier(0.2,0.8,0.2,1)`,
        pointerEvents: ready ? 'none' : 'auto',
      }}
    >
      <div className="w-[min(280px,70vw)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[15px] font-semibold uppercase tracking-[0.18em]">
            {BRAND.name}
          </span>
          <span className="mono text-xs tabular-nums text-ink-2">
            {String(shown).padStart(2, '0')}%
          </span>
        </div>
        <div className="mt-3 h-px w-full bg-line">
          <div
            className="h-px bg-ink transition-[width] duration-300 ease-out"
            style={{ width: `${shown}%` }}
          />
        </div>
        <p className="mono mt-3 text-[11px] uppercase tracking-[0.14em] text-ink-3">
          {LINES[line]}…
        </p>
      </div>
    </div>
  );
}
