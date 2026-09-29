import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { useSceneStore } from '../store/useSceneStore';

gsap.registerPlugin(ScrollTrigger);

export interface ScrollSectionsProps {
  reducedMotion: boolean;
}

export function ScrollSections({ reducedMotion }: ScrollSectionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const craftRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    /**
     * `scrub: 1` gives a 1-second catch-up, which is what makes the camera
     * feel weighted rather than glued to the wheel. Under reduced motion we
     * drop to `true` (direct, frame-accurate) so there is no residual glide.
     */
    const scrub: number | boolean = reducedMotion ? true : 1;

    const context = gsap.context(() => {
      /* ------------------------------------------------------------ *
       * MASTER PROGRESS
       *
       * The one and only bridge from scroll to the 3D scene. A plain
       * ScrollTrigger reports raw, unsmoothed progress, so instead we
       * scrub a proxy object — that way the value handed to R3F already
       * carries the same easing as the DOM parallax layers, and the
       * bottle and the background never drift out of sync.
       * ------------------------------------------------------------ */
      const proxy = { value: 0 };
      const setProgress = useSceneStore.getState().setProgress;

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

      /* ------------------------------------------------------------ *
       * HERO COPY — visible at load, so it only ever fades out.
       * Gone by the time the camera starts its first orbit.
       * ------------------------------------------------------------ */
      if (heroRef.current && sectionRefs.current[0]) {
        gsap.fromTo(
          heroRef.current,
          { opacity: 1, y: 0 },
          {
            opacity: 0,
            y: -40,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRefs.current[0],
              start: 'top top',
              end: 'bottom center',
              scrub,
            },
          },
        );
      }

      /* ------------------------------------------------------------ *
       * SECTION COPY — one timeline per block, spanning
       * [sectionTop - 100vh, sectionTop + 100vh]. The hold phase is the
       * middle third, so each block is at full opacity exactly while its
       * section owns the viewport.
       * ------------------------------------------------------------ */
      const fadeInOut = (element: HTMLElement | null, sectionIndex: number) => {
        const section = sectionRefs.current[sectionIndex];
        if (!element || !section) return;

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top bottom',
            end: 'bottom top',
            scrub,
            invalidateOnRefresh: true,
          },
        });

        timeline
          .fromTo(
            element,
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 1, ease: 'none' },
          )
          .to(element, { opacity: 1, duration: 1, ease: 'none' })
          .to(element, { opacity: 0, y: -30, duration: 1, ease: 'none' });
      };

      fadeInOut(notesRef.current, 1); // section 2
      fadeInOut(craftRef.current, 3); // section 4
      fadeInOut(ctaRef.current, 4); // section 5 — clamps at full opacity

      // Section 3 carries no copy on purpose: the cap lift is the content.
    }, container);

    // The 500vh page depends on viewport height; recompute after fonts land.
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh).catch(() => undefined);

    return () => context.revert();
  }, [reducedMotion]);

  const registerSection = (index: number) => (element: HTMLElement | null) => {
    sectionRefs.current[index] = element;
  };

  return (
    /* Total page height: 5 x 100vh = 500vh.
       z-20 puts the copy above the background layers and the canvas;
       pointer-events-none lets the pointer-parallax tracking (and any future
       orbit controls) keep working straight through the text. */
    <div ref={containerRef} className="relative z-20 w-full">
      {/* ============================================================ *
          SECTION 1 — HERO
          ============================================================ */}
      <section
        ref={registerSection(0)}
        className="pointer-events-none flex h-screen w-full items-center justify-center px-6"
      >
        <div ref={heroRef} className="text-center">
          <h1
            className="font-display italic text-5xl leading-[0.95] sm:text-7xl md:text-8xl"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            Where shadow
          </h1>
          <h1
            className="-mt-2 font-display italic text-5xl leading-[0.95] sm:text-7xl md:text-8xl"
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
          >
            meets amber
          </h1>
          <p
            className="mt-8 text-sm uppercase tracking-[0.3em]"
            style={{ color: 'var(--text-muted)' }}
          >
            NOIR AMBRE — Eau de Parfum
          </p>
        </div>
      </section>

      {/* ============================================================ *
          SECTION 2 — NOTES. Left, bottom-anchored.
          ============================================================ */}
      <section
        ref={registerSection(1)}
        className="pointer-events-none flex h-screen w-full items-end justify-start px-6 pb-20 sm:px-12 md:px-20"
      >
        <p
          ref={notesRef}
          className="font-display italic text-3xl"
          style={{ color: 'var(--text-primary)' }}
        >
          Bergamot. Black Amber. Oud.
        </p>
      </section>

      {/* ============================================================ *
          SECTION 3 — THE CAP LIFT. No copy; the bottle is the moment.
          ============================================================ */}
      <section ref={registerSection(2)} className="pointer-events-none h-screen w-full" />

      {/* ============================================================ *
          SECTION 4 — CRAFT. Two columns, copy on the right.
          ============================================================ */}
      <section
        ref={registerSection(3)}
        className="pointer-events-none h-screen w-full items-center px-6 sm:px-12 md:px-20"
      >
        <div className="grid h-full w-full grid-cols-1 items-center gap-8 md:grid-cols-2">
          {/* Left column intentionally empty — it is the bottle's column. */}
          <div className="hidden md:block" />
          <div ref={craftRef} className="flex flex-col items-start md:items-end">
            <h2
              className="font-display italic text-4xl md:text-right"
              style={{ color: 'var(--text-primary)' }}
            >
              Hand-blown. Small batch.
            </h2>
            <p
              className="mt-5 max-w-xs text-sm leading-relaxed md:text-right"
              style={{ color: 'var(--text-muted)' }}
            >
              Each bottle is individually blown by master glassworkers in small batches of
              200, no two exactly alike.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================ *
          SECTION 5 — CTA. Centered, final settled hero shot behind it.
          ============================================================ */}
      <section
        ref={registerSection(4)}
        className="pointer-events-none flex h-screen w-full items-end justify-center px-6 pb-24"
      >
        <div ref={ctaRef} className="text-center">
          <button
            type="button"
            // The only interactive element on the page, so it opts back in.
            className="pointer-events-auto rounded-full px-8 py-4 text-sm font-medium uppercase tracking-[0.15em] transition-all hover:scale-[1.03]"
            style={{
              backgroundColor: 'var(--accent-gold)',
              color: 'var(--bg-base)',
            }}
            onMouseEnter={(event) => {
              event.currentTarget.style.backgroundColor = 'var(--accent-gold-hover)';
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'var(--accent-gold)';
            }}
            onFocus={(event) => {
              event.currentTarget.style.backgroundColor = 'var(--accent-gold-hover)';
            }}
            onBlur={(event) => {
              event.currentTarget.style.backgroundColor = 'var(--accent-gold)';
            }}
          >
            Discover the Collection
          </button>
        </div>
      </section>
    </div>
  );
}
