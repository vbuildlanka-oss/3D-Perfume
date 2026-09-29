import { COLORWAYS, getColorway } from '../../config/product';
import { useSceneStore } from '../../store/useSceneStore';

/** Swatches get the shoe's actual two-tone: upper colour over the white midsole. */
const SWATCH_UPPER: Record<string, string> = {
  harbour: '#307ba1',
  dune: '#c3a4a4',
  signal: '#2a2928',
};
const SWATCH_DETAIL: Record<string, string> = {
  harbour: '#204559',
  dune: '#6d5959',
  signal: '#e4454a',
};

export function ColorwayPicker({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const colorway = useSceneStore((s) => s.colorway);
  const setColorway = useSceneStore((s) => s.setColorway);
  const active = getColorway(colorway);
  const dim = size === 'lg' ? 'h-14 w-14' : 'h-9 w-9';

  return (
    <div>
      <div role="radiogroup" aria-label="Colour" className="flex items-center gap-3">
        {COLORWAYS.map((c) => {
          const selected = c.id === colorway;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={c.name}
              onClick={() => setColorway(c.id)}
              className={`group relative ${dim} rounded-full transition-transform duration-200 hover:scale-105`}
              style={{
                boxShadow: selected
                  ? '0 0 0 2px var(--paper), 0 0 0 3.5px var(--ink)'
                  : '0 0 0 1px var(--line)',
              }}
            >
              <span
                className="absolute inset-0 overflow-hidden rounded-full"
                style={{
                  background: `linear-gradient(160deg, ${SWATCH_UPPER[c.id]} 0 58%, #f1f1ef 58% 100%)`,
                }}
              >
                <span
                  className="absolute left-[18%] top-[30%] h-[34%] w-[16%] -skew-x-12 rounded-sm"
                  style={{ background: SWATCH_DETAIL[c.id], opacity: 0.9 }}
                />
                <span
                  className="absolute left-[40%] top-[30%] h-[34%] w-[16%] -skew-x-12 rounded-sm"
                  style={{ background: SWATCH_DETAIL[c.id], opacity: 0.9 }}
                />
              </span>
            </button>
          );
        })}
      </div>
      <p className={`${size === 'lg' ? 'mt-4' : 'mt-2.5'} text-sm`} aria-live="polite">
        <span className="font-semibold text-ink">{active.name}</span>
        {size === 'lg' && <span className="text-ink-2"> — {active.note}</span>}
      </p>
    </div>
  );
}
