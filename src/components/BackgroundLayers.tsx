import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { PARALLAX_RATES, SCROLL_SPAN } from '../config/scrollSequence';

gsap.registerPlugin(ScrollTrigger);

/* ================================================================== *
 * BOKEH FIELD
 *
 * Seeded, not Math.random(): a fixed seed means the field is identical
 * across reloads and across HMR, so the composition you tune is the
 * composition you ship.
 * ================================================================== */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DESKTOP_PARTICLES = 40;
const MOBILE_PARTICLES = 15;

interface Particle {
  size: number;
  left: number;
  top: number;
  opacity: number;
  duration: number;
  delay: number;
}

function buildParticles(count: number): Particle[] {
  const random = mulberry32(0x9e3779b9);
  return Array.from({ length: count }, () => ({
    size: 6 + random() * 8, //        6 -> 14px
    left: random() * 100, //          full width
    top: random() * 100, //           full height of the (oversized) layer
    opacity: 0.15 + random() * 0.2, //0.15 -> 0.35
    duration: 8 + random() * 6, //    8 -> 14s
    delay: -random() * 14, //         negative delay: the field starts mid-cycle
  }));
}

/* ================================================================== *
 * LAYER TRAVEL
 *
 * These layers are position:fixed, so their natural parallax rate is 0x.
 * To make a fixed layer appear to move at Nx the scroll speed we translate
 * it by N * (total scrollable distance).
 *
 * Total scrollable distance on a 500vh page is 400vh, i.e.
 * SCROLL_SPAN * viewportHeight.
 *
 * Each layer is then made taller than the viewport by at least its own
 * travel distance, so translating it never exposes an empty edge.
 * ================================================================== */
const layerTravel = (rate: number, viewportHeight: number) =>
  -rate * SCROLL_SPAN * viewportHeight;

export interface BackgroundLayersProps {
  isMobile: boolean;
}

export function BackgroundLayers({ isMobile }: BackgroundLayersProps) {
  const gradientRef = useRef<HTMLDivElement>(null);
  const bokehRef = useRef<HTMLDivElement>(null);

  const particles = useMemo(
    () => buildParticles(isMobile ? MOBILE_PARTICLES : DESKTOP_PARTICLES),
    [isMobile],
  );

  useEffect(() => {
    const gradient = gradientRef.current;
    const bokeh = bokehRef.current;
    if (!gradient || !bokeh) return;

    const context = gsap.context(() => {
      // `ease: 'none'` — a parallax layer must track scroll linearly. The
      // `scrub: 1` below is what provides the (1s) smoothing, and it applies
      // equally in both scroll directions.
      const common = {
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 1,
          invalidateOnRefresh: true,
        },
      } as const;

      gsap.to(gradient, {
        ...common,
        y: () => layerTravel(PARALLAX_RATES.gradient, window.innerHeight),
      });

      gsap.to(bokeh, {
        ...common,
        y: () => layerTravel(PARALLAX_RATES.bokeh, window.innerHeight),
      });

      // The vignette (z-2) is deliberately pinned to the viewport at 0x.
      // A vignette that slides with the content stops reading as a lens
      // effect and starts reading as a grey rectangle.
    });

    return () => context.revert();
  }, [isMobile]);

  return (
    <div aria-hidden="true">
      {/* ---------------------------------------------------------------- *
          z-0 — base radial gradient.
          Oversized by 50vh so its 40vh of travel never reveals an edge.
          ---------------------------------------------------------------- */}
      <div
        ref={gradientRef}
        className="pointer-events-none fixed left-0 z-0 w-full"
        style={{
          top: '-25vh',
          height: '150vh',
          background:
            'radial-gradient(circle at 50% 40%, var(--bg-elevated) 0%, var(--bg-base) 70%)',
          willChange: 'transform',
        }}
      />

      {/* ---------------------------------------------------------------- *
          z-1 — bokeh field.
          Travels a full viewport height (0.25 x 400vh), so the layer is
          200vh tall and offset upward to stay covered throughout.
          ---------------------------------------------------------------- */}
      <div
        ref={bokehRef}
        className="pointer-events-none fixed left-0 z-[1] w-full overflow-hidden"
        style={{ top: '-50vh', height: '200vh', willChange: 'transform' }}
      >
        {particles.map((particle, index) => (
          <span
            key={index}
            className="bokeh-particle"
            style={{
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              opacity: particle.opacity,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* ---------------------------------------------------------------- *
          z-2 — vignette. Locked to the viewport (0x parallax).
          ---------------------------------------------------------------- */}
      <div
        className="pointer-events-none fixed inset-0 z-[2]"
        style={{
          background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
