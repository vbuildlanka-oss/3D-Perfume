import { useEffect, useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { BRAND, formatPrice } from '../config/product';
import { CHAPTERS } from '../config/scrollSequence';
import { scrollToTarget } from '../hooks/useSmoothScroll';
import { useSceneStore } from '../store/useSceneStore';
import { BuyPanel } from './story/BuyPanel';
import { ColorwayPicker } from './story/ColorwayPicker';

gsap.registerPlugin(ScrollTrigger);

/* ------------------------------------------------------------------ *
 * Layout helpers
 * ------------------------------------------------------------------ */
type Place = 'left' | 'right' | 'bottom' | 'bottom-left';

const PLACE: Record<Place, string> = {
  // Mobile always stacks the copy at the bottom; the shoe sits above it.
  left: 'items-end md:items-center md:justify-start',
  right: 'items-end md:items-center md:justify-end lg:pr-14',
  bottom: 'items-end md:justify-center',
  'bottom-left': 'items-end md:justify-start',
};

function Chapter({
  index,
  place,
  children,
  interactive = false,
}: {
  index: number;
  place: Place;
  children: ReactNode;
  interactive?: boolean;
}) {
  return (
    <section
      id={`chapter-${CHAPTERS[index].id}`}
      data-chapter={index}
      aria-label={CHAPTERS[index].label}
      className="pointer-events-none relative flex h-screen w-full"
    >
      <div
        className={`mx-auto flex h-full w-full max-w-page px-6 pb-10 pt-[calc(var(--header-h)+24px)] sm:px-10 md:pb-16 ${PLACE[place]}`}
      >
        <div data-copy className={`w-full md:w-auto ${interactive ? 'pointer-events-auto' : ''}`}>
          {children}
        </div>
      </div>
    </section>
  );
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow flex items-center gap-3">
      <span className="accent-transition h-px w-8 bg-accent" />
      <span>{children}</span>
    </p>
  );
}

/* ------------------------------------------------------------------ *
 * The story
 * ------------------------------------------------------------------ */
export function ScrollSections({ reducedMotion }: { reducedMotion: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Lenis already smooths the wheel, so the scrub only adds a little
    // weight. Reduced motion: frame-accurate, no glide.
    const scrub: number | boolean = reducedMotion ? true : 0.6;
    const { setProgress, setStoryActive } = useSceneStore.getState();

    const ctx = gsap.context(() => {
      /* MASTER PROGRESS — the one bridge from scroll to the 3D scene. */
      const proxy = { value: 0 };
      gsap.to(proxy, {
        value: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: 'bottom bottom',
          scrub,
          invalidateOnRefresh: true,
        },
        onUpdate: () => setProgress(proxy.value),
      });

      /* Stop rendering WebGL once the story has fully scrolled away. */
      ScrollTrigger.create({
        trigger: container,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => setStoryActive(self.isActive),
      });

      /* COPY — each chapter fades up in, holds, and drifts out. */
      const sections = gsap.utils.toArray<HTMLElement>('[data-chapter]', container);
      sections.forEach((section, i) => {
        const copy = section.querySelector<HTMLElement>('[data-copy]');
        if (!copy) return;
        const first = i === 0;
        const last = i === sections.length - 1;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: first ? 'top top' : 'top bottom',
            end: last ? 'top top' : 'bottom top',
            scrub,
            invalidateOnRefresh: true,
          },
        });

        if (!first) {
          tl.fromTo(
            copy,
            { autoAlpha: 0, y: 48 },
            { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out' },
          );
        }
        if (!last) {
          tl.to(copy, { autoAlpha: 1, duration: first ? 0.4 : 0.5 });
          tl.to(copy, { autoAlpha: 0, y: -40, duration: first ? 0.6 : 0.8, ease: 'power1.in' });
        }
      });
    }, container);

    document.fonts?.ready.then(() => ScrollTrigger.refresh()).catch(() => undefined);
    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div id="story" ref={containerRef} className="relative z-20 w-full">
      {/* 00 — Intro */}
      <Chapter index={0} place="left" interactive>
        <div className="max-w-[560px] pb-4 md:pb-0">
          <p className="eyebrow">
            {BRAND.model} · {BRAND.category} · {formatPrice(BRAND.price)}
          </p>
          <h1 className="display mt-5 text-[3.1rem] sm:text-7xl lg:text-[5.6rem]">
            For the miles
            <br />
            <span className="serif italic font-normal tracking-[-0.02em]">nobody</span> posts
            <br />
            about.
          </h1>
          <p className="body-copy mt-6 max-w-[400px]">
            A daily trainer for Tuesday mornings, wet pavements and the extra loop you didn’t plan.
            248 grams, and nothing you’ll have to think about.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-ink"
              onClick={() => {
                const buy = document.getElementById('chapter-buy');
                if (buy) scrollToTarget(buy);
              }}
            >
              Shop — {formatPrice(BRAND.price)}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                const next = document.getElementById('chapter-upper');
                if (next) scrollToTarget(next);
              }}
            >
              Take a closer look
            </button>
          </div>
        </div>
      </Chapter>

      {/* 01 — Upper */}
      <Chapter index={1} place="left">
        <div className="max-w-[440px]">
          <Kicker>Upper</Kicker>
          <h2 className="h2 mt-5">
            A knit that learns your foot, then{' '}
            <span className="serif italic font-normal">leaves it alone.</span>
          </h2>
          <p className="body-copy mt-5">
            One layer of engineered mesh — tighter over the toes, open through the midfoot so it
            breathes in August. It gives a little in the first week, then holds its shape.
          </p>
          <dl className="mt-7 grid max-w-[360px] grid-cols-2 gap-x-6 border-t border-line pt-5 text-sm">
            <div>
              <dt className="text-ink-2">Recycled polyester</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">81%</dd>
            </div>
            <div>
              <dt className="text-ink-2">Stitched overlays</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums">0</dd>
            </div>
          </dl>
        </div>
      </Chapter>

      {/* 02 — Cushion (the pins on the shoe carry the numbers) */}
      <Chapter index={2} place="bottom-left">
        <div className="max-w-[520px]">
          <Kicker>Cushion</Kicker>
          <h2 className="h2 mt-5">
            Soft on landing. <span className="serif italic font-normal">Not</span> mushy on the way
            out.
          </h2>
          <p className="body-copy mt-5 max-w-[440px]">
            A supercritical foam midsole, 34 mm under the heel and 26 under the forefoot. We tuned
            it with a sports physio whose only note, for eleven rounds, was “less.”
          </p>
        </div>
      </Chapter>

      {/* 03 — Grip */}
      <Chapter index={3} place="right">
        <div className="max-w-[420px] md:text-right">
          <div className="md:flex md:justify-end">
            <Kicker>Grip</Kicker>
          </div>
          <h2 className="h2 mt-5">
            Rubber where you <span className="serif italic font-normal">actually</span> push off.
          </h2>
          <p className="body-copy mt-5">
            Full-length outsole with 3 mm lugs, cut deeper under the forefoot. It did 1,200 km on
            Lisbon’s wet cobbles before we signed it off. The cobbles are fine.
          </p>
        </div>
      </Chapter>

      {/* 04 — Heel */}
      <Chapter index={4} place="left">
        <div className="max-w-[420px]">
          <Kicker>Heel</Kicker>
          <h2 className="h2 mt-5">
            No blisters. <span className="serif italic font-normal">We checked.</span>
          </h2>
          <p className="body-copy mt-5">
            A padded collar and a heel counter moulded from recycled TPU, so your heel sits in the
            shoe instead of on top of it. The pull tab is big enough for cold fingers in January.
          </p>
        </div>
      </Chapter>

      {/* 05 — Colour */}
      <Chapter index={5} place="bottom" interactive>
        <div className="pointer-events-auto flex flex-col gap-6 md:flex-row md:items-end md:gap-16">
          <div className="max-w-[420px]">
            <Kicker>Colour</Kicker>
            <h2 className="h2 mt-5">
              Three colours. <span className="serif italic font-normal">None</span> of them limited.
            </h2>
          </div>
          <div className="md:pb-1">
            <ColorwayPicker />
          </div>
        </div>
      </Chapter>

      {/* 06 — Buy */}
      <Chapter index={6} place="right" interactive>
        <div className="flex w-full justify-center md:justify-end">
          <BuyPanel />
        </div>
      </Chapter>
    </div>
  );
}
