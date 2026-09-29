import { useState } from 'react';

import { BRAND, formatPrice, getColorway } from '../../config/product';
import { useSceneStore } from '../../store/useSceneStore';
import { ColorwayPicker } from './ColorwayPicker';

/** US men's sizes. A couple are sold out — it's a real shop, that happens. */
const SIZES = ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12', '13'];
const SOLD_OUT: Record<string, string[]> = {
  harbour: ['13'],
  dune: ['7', '11.5'],
  signal: ['9.5'],
};

export function BuyPanel() {
  const colorway = useSceneStore((s) => s.colorway);
  const size = useSceneStore((s) => s.size);
  const setSize = useSceneStore((s) => s.setSize);
  const addToBag = useSceneStore((s) => s.addToBag);
  const [nudge, setNudge] = useState(false);
  const soldOut = SOLD_OUT[colorway] ?? [];
  const sizeUnavailable = size !== null && soldOut.includes(size);

  const onAdd = () => {
    if (!size || sizeUnavailable) {
      setNudge(true);
      window.setTimeout(() => setNudge(false), 1800);
      return;
    }
    addToBag({ colorway, size });
  };

  return (
    <div className="pointer-events-auto w-full max-w-[420px] rounded-[28px] bg-paper/90 p-5 shadow-[0_1px_0_rgba(20,20,20,0.04),0_24px_60px_-24px_rgba(20,20,20,0.18)] ring-1 ring-line backdrop-blur-md sm:p-8">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="eyebrow">{BRAND.category}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight">
            {BRAND.name} {BRAND.model}
          </h3>
        </div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight">
          {formatPrice(BRAND.price)}
        </p>
      </div>

      <div className="mt-4 sm:mt-6">
        <ColorwayPicker size="sm" />
      </div>

      <fieldset className="mt-4 sm:mt-6">
        <div className="flex items-baseline justify-between">
          <legend className="text-sm font-medium">Size (US men’s)</legend>
          <a href="#specs" className="link-underline text-xs text-ink-2">
            Fit guide
          </a>
        </div>
        <div className="mt-3 grid grid-cols-6 gap-1.5 [&>button]:h-9 sm:[&>button]:h-10">
          {SIZES.map((s) => {
            const out = soldOut.includes(s);
            const selected = s === size;
            return (
              <button
                key={s}
                type="button"
                disabled={out}
                aria-pressed={selected}
                aria-label={out ? `${s}, sold out` : s}
                onClick={() => setSize(s)}
                className={`h-10 rounded-xl text-sm tabular-nums transition-colors duration-150 ${
                  selected
                    ? 'bg-ink text-paper'
                    : out
                      ? 'cursor-not-allowed text-ink-3 line-through decoration-ink-3/60'
                      : 'text-ink ring-1 ring-inset ring-line hover:ring-ink'
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p
          className={`mt-3 h-4 text-xs transition-opacity duration-200 ${nudge ? 'opacity-100' : 'opacity-0'}`}
          style={{ color: 'var(--accent)' }}
          role="status"
        >
          {sizeUnavailable
            ? `Size ${size} is sold out in ${getColorway(colorway).name}.`
            : 'Pick a size first — we’d hate to guess.'}
        </p>
      </fieldset>

      <button type="button" onClick={onAdd} className="btn-ink mt-3 w-full py-4 text-[15px]">
        Add to bag
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path
            d="M3 8h9M8.5 4.5 12 8l-3.5 3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <ul className="mt-4 space-y-1 text-[12.5px] text-ink-2 sm:mt-5 sm:space-y-1.5 sm:text-[13px]">
        <li>Free returns for 60 days — even if you’ve run in them.</li>
        <li className="hidden sm:list-item">
          Ships in 2–3 working days from our warehouse in Porto.
        </li>
      </ul>
    </div>
  );
}
