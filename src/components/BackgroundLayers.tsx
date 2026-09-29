import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { BRAND } from '../config/product';
import { PARALLAX_RATES, SCROLL_SPAN } from '../config/scrollSequence';

gsap.registerPlugin(ScrollTrigger);

/**
 * Three fixed layers behind the canvas, each drifting at its own rate while
 * the story scrolls:
 *
 *   z-0  paper wash — a barely-there warm falloff so the white has depth
 *   z-1  the wordmark, set huge in outline, plus a faint column grid
 *   z-2  floor — a soft grey band where the shoe's shadow lands
 *
 * They are covered by the rest of the page once the story ends.
 */
export function BackgroundLayers() {
  const washRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const travel = (rate: number) => () => -rate * SCROLL_SPAN * window.innerHeight;
      const trigger = {
        trigger: '#story',
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        invalidateOnRefresh: true,
      };
      gsap.to(washRef.current, {
        y: travel(PARALLAX_RATES.wash),
        ease: 'none',
        scrollTrigger: trigger,
      });
      gsap.to(wordRef.current, {
        y: travel(PARALLAX_RATES.wordmark),
        ease: 'none',
        scrollTrigger: { ...trigger },
      });
    });
    return () => ctx.revert();
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* z-0 — paper wash. Oversized so translating it never shows an edge. */}
      <div
        ref={washRef}
        className="absolute inset-x-0 top-0"
        style={{
          zIndex: 0,
          height: '200vh',
          background:
            'radial-gradient(120% 60% at 50% 22%, var(--paper) 35%, var(--paper-2) 75%, var(--paper-3) 100%)',
        }}
      />

      {/* z-1 — outline wordmark and column grid. */}
      <div
        ref={wordRef}
        className="absolute inset-x-0 top-0"
        style={{ zIndex: 1, height: '200vh' }}
      >
        <div
          className="absolute inset-0 mx-auto hidden max-w-page grid-cols-12 px-6 sm:px-10 md:grid"
          style={{ columnGap: 24 }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className="h-full border-x"
              style={{ borderColor: 'rgba(20,20,20,0.028)' }}
            />
          ))}
        </div>
        <p
          className="absolute left-1/2 top-[30vh] -translate-x-1/2 select-none whitespace-nowrap font-semibold uppercase leading-none"
          style={{
            fontSize: 'clamp(7rem, 24vw, 26rem)',
            letterSpacing: '-0.06em',
            color: 'transparent',
            WebkitTextStroke: '1px rgba(20,20,20,0.07)',
          }}
        >
          {BRAND.name}
        </p>
      </div>

      {/* z-2 — floor. Fixed to the viewport; a moving floor reads as a bug. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[38vh]"
        style={{
          zIndex: 2,
          background:
            'linear-gradient(to bottom, rgba(236,235,231,0) 0%, rgba(236,235,231,0.55) 100%)',
        }}
      />
    </div>
  );
}
