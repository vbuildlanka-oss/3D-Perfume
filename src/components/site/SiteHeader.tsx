import { useEffect, useRef, useState } from 'react';

import { BRAND, formatPrice, getColorway } from '../../config/product';
import { scrollToTarget } from '../../hooks/useSmoothScroll';
import { useSceneStore } from '../../store/useSceneStore';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="currentColor" />
        <path
          d="M8 21.5c4.5 0 7-1.6 9.4-4.6l3.2-4c.9-1.1 2.2-1.9 3.4-1.9v3.2c-1 0-1.6.4-2.3 1.3l-2.9 3.7C16 22.8 12.8 24.7 8 24.7z"
          fill="var(--paper)"
        />
      </svg>
      <span className="text-[15px] font-semibold uppercase tracking-[0.18em]">{BRAND.name}</span>
    </span>
  );
}

const jump = (id: string) => () => {
  const el = document.getElementById(id);
  if (el) scrollToTarget(el);
};

export function SiteHeader() {
  const bag = useSceneStore((s) => s.bag);
  const [scrolled, setScrolled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [bagOpen, setBagOpen] = useState(false);
  const prevCount = useRef(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A small confirmation whenever something lands in the bag.
  useEffect(() => {
    if (bag.length > prevCount.current) {
      const item = bag[bag.length - 1];
      setToast(`${getColorway(item.colorway).name}, US ${item.size} — in your bag.`);
      const t = window.setTimeout(() => setToast(null), 3200);
      prevCount.current = bag.length;
      return () => window.clearTimeout(t);
    }
    prevCount.current = bag.length;
  }, [bag]);

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-40 transition-[background-color,box-shadow] duration-300"
        style={{
          height: 'var(--header-h)',
          backgroundColor: scrolled ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0)',
          backdropFilter: scrolled ? 'blur(14px) saturate(1.4)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(1.4)' : 'none',
          boxShadow: scrolled ? '0 1px 0 var(--line)' : 'none',
        }}
      >
        <div className="mx-auto flex h-full max-w-page items-center justify-between px-6 sm:px-10">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget(0);
            }}
            aria-label={`${BRAND.name} — back to top`}
          >
            <Logo />
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-8 text-sm md:flex">
            <button type="button" onClick={jump('chapter-upper')} className="link-underline">
              Model 01
            </button>
            <button type="button" onClick={jump('reviews')} className="link-underline">
              Reviews
            </button>
            <button type="button" onClick={jump('journal')} className="link-underline">
              Journal
            </button>
            <button type="button" onClick={jump('specs')} className="link-underline">
              Fit &amp; specs
            </button>
          </nav>

          <div className="relative">
            <button
              type="button"
              onClick={() => setBagOpen((o) => !o)}
              aria-expanded={bagOpen}
              className="flex items-center gap-2 rounded-full px-3 py-2 text-sm ring-1 ring-line transition hover:ring-ink"
            >
              Bag
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] tabular-nums transition-colors ${
                  bag.length ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-2'
                }`}
              >
                {bag.length}
              </span>
            </button>

            {bagOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-paper p-4 text-sm shadow-[0_20px_50px_-20px_rgba(20,20,20,0.3)] ring-1 ring-line">
                {bag.length === 0 ? (
                  <p className="text-ink-2">Nothing in here yet. The shoes are just down there.</p>
                ) : (
                  <>
                    <ul className="divide-y divide-line">
                      {bag.map((item, i) => (
                        <li key={i} className="flex justify-between py-2">
                          <span>
                            {BRAND.model} · {getColorway(item.colorway).name}
                            <span className="block text-xs text-ink-2">US {item.size}</span>
                          </span>
                          <span className="tabular-nums">{formatPrice(BRAND.price)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex justify-between border-t border-line pt-3 font-medium">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatPrice(BRAND.price * bag.length)}</span>
                    </div>
                    <button type="button" className="btn-ink mt-4 w-full">
                      Checkout
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="toast fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-full bg-ink py-3 pl-5 pr-3 text-sm text-paper shadow-lg"
        >
          {toast}
          <button
            type="button"
            className="rounded-full bg-paper/15 px-3 py-1 text-xs hover:bg-paper/25"
            onClick={() => {
              setBagOpen(true);
              setToast(null);
            }}
          >
            View
          </button>
        </div>
      )}
    </>
  );
}
