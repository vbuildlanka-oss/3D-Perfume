import { useEffect, useState } from 'react';

import { CHAPTERS, chapterIndexForProgress } from '../../config/scrollSequence';
import { scrollToTarget } from '../../hooks/useSmoothScroll';
import { useSceneStore } from '../../store/useSceneStore';

/**
 * Right-edge chapter index. Subscribes to progress but only re-renders when
 * the *chapter* changes, not on every scroll tick.
 */
export function ChapterRail() {
  const [active, setActive] = useState(0);
  const storyActive = useSceneStore((s) => s.storyActive);

  useEffect(
    () =>
      useSceneStore.subscribe((state) => {
        const next = chapterIndexForProgress(state.progress);
        setActive((prev) => (prev === next ? prev : next));
      }),
    [],
  );

  return (
    <nav
      aria-label="Chapters"
      className={`fixed right-5 top-1/2 z-[15] hidden -translate-y-1/2 transition-opacity duration-500 lg:block ${
        storyActive ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
    >
      <ol className="flex flex-col items-end gap-3">
        {CHAPTERS.map((chapter, i) => {
          const on = i === active;
          return (
            <li key={chapter.id}>
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById(`chapter-${chapter.id}`);
                  if (el) scrollToTarget(el);
                }}
                aria-current={on ? 'step' : undefined}
                className="group flex items-center gap-3 py-0.5"
              >
                <span
                  className={`mono text-[10px] uppercase tracking-[0.14em] transition-all duration-300 ${
                    on
                      ? 'text-ink opacity-0 group-hover:opacity-100'
                      : 'text-ink-2 opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {chapter.label}
                </span>
                <span
                  className={`block h-px transition-all duration-300 ${on ? 'w-8 bg-ink' : 'w-4 bg-ink/25 group-hover:bg-ink/60'}`}
                />
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Bottom-left "02 / 07" counter — a quiet sense of where you are. */
export function ChapterCounter() {
  const [active, setActive] = useState(0);
  const storyActive = useSceneStore((s) => s.storyActive);

  useEffect(
    () =>
      useSceneStore.subscribe((state) => {
        const next = chapterIndexForProgress(state.progress);
        setActive((prev) => (prev === next ? prev : next));
      }),
    [],
  );

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      aria-hidden="true"
      className={`mono pointer-events-none fixed bottom-6 left-10 z-[15] hidden text-[11px] tabular-nums tracking-[0.14em] text-ink-2 transition-opacity duration-500 lg:block ${
        storyActive && active > 0 ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <span className="text-ink">{pad(active + 1)}</span> / {pad(CHAPTERS.length)}
    </div>
  );
}
