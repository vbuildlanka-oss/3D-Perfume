import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

import { chapterPresence } from '../config/scrollSequence';
import { getSceneState } from '../store/useSceneStore';

/**
 * Callouts pinned to points on the shoe. They live inside the shoe's motion
 * group, so they ride along with every rotation, bob and hop, and fade in
 * only while their chapter owns the viewport.
 *
 * Positions are in normalised shoe space (see scrollSequence.ts):
 * toe at x = -1.3, heel at x = +1.3, sole at y ≈ -0.67, lateral face z ≈ +0.45.
 */
interface Pin {
  chapter: number;
  position: [number, number, number];
  label: string;
  value?: string;
  /** Which side of the dot the label sits on. */
  side: 'left' | 'right';
  /** Leader line length in px. */
  reach?: number;
  /** Shown on phones too (as a compact label above the dot). */
  mobile?: boolean;
}

const PINS: Pin[] = [
  // 01 — Upper
  {
    chapter: 1,
    position: [-0.55, 0.02, 0.42],
    mobile: true,
    label: 'Engineered knit',
    value: 'one layer',
    side: 'left',
    reach: 70,
  },
  {
    chapter: 1,
    position: [0.1, 0.38, 0.26],
    label: 'Lace cage',
    value: 'no-sew',
    side: 'right',
    reach: 96,
  },
  // 02 — Cushion
  {
    chapter: 2,
    position: [0.95, -0.44, 0.34],
    mobile: true,
    label: 'Heel stack',
    value: '34 mm',
    side: 'right',
    reach: 64,
  },
  {
    chapter: 2,
    position: [-0.45, -0.5, 0.36],
    mobile: true,
    label: 'Forefoot',
    value: '26 mm',
    side: 'right',
    reach: 44,
  },
  {
    chapter: 2,
    position: [-1.26, -0.4, 0.05],
    label: 'Rocker toe',
    value: '8 mm drop',
    side: 'left',
    reach: 36,
  },
  // 03 — Grip
  {
    chapter: 3,
    position: [-0.7, -0.62, 0.05],
    mobile: true,
    label: 'Forefoot lugs',
    value: '3 mm',
    side: 'left',
    reach: 60,
  },
  {
    chapter: 3,
    position: [0.85, -0.62, 0.02],
    label: 'Heel crash pad',
    value: 'softer rubber',
    side: 'right',
    reach: 60,
  },
  // 04 — Heel
  {
    chapter: 4,
    position: [1.02, 0.58, 0.0],
    mobile: true,
    label: 'Pull tab',
    value: 'cold-finger sized',
    side: 'right',
    reach: 56,
  },
  {
    chapter: 4,
    position: [1.2, 0.02, 0.16],
    label: 'Heel counter',
    value: 'recycled TPU',
    side: 'right',
    reach: 70,
  },
];

function PinLabel({ pin, compact }: { pin: Pin; compact: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reach = pin.reach ?? 56;

  useFrame(() => {
    const el = ref.current;
    if (!el) return;
    const presence = chapterPresence(getSceneState().progress, pin.chapter, 0.32);
    el.style.opacity = presence.toFixed(3);
    el.style.visibility = presence < 0.01 ? 'hidden' : 'visible';
  });

  const isRight = pin.side === 'right';

  return (
    <Html position={pin.position} zIndexRange={[15, 11]} style={{ pointerEvents: 'none' }}>
      {compact ? (
        // Phones: a small tag stacked above the dot, centred on the point.
        <div
          ref={ref}
          className="pin flex flex-col items-center"
          style={{
            opacity: 0,
            visibility: 'hidden',
            transform: 'translate(-50%, calc(-100% + 4.5px))',
          }}
        >
          <span className="rounded-md bg-paper/90 px-1.5 py-0.5 text-center">
            <span className="mono block text-[9px] uppercase tracking-[0.12em] text-ink-2">
              {pin.label}
            </span>
            {pin.value && (
              <span className="block text-[13px] font-semibold leading-tight">{pin.value}</span>
            )}
          </span>
          <span className="h-4 w-px bg-ink/60" />
          <span className="pin__dot" />
        </div>
      ) : (
        <div
          ref={ref}
          className="pin"
          style={{
            opacity: 0,
            visibility: 'hidden',
            // The row is vertically centred on the dot, so -50% puts the dot on it.
            transform: `translate(${isRight ? '-4.5px' : 'calc(-100% + 4.5px)'}, -50%)`,
          }}
        >
          <div className={`flex items-center ${isRight ? '' : 'flex-row-reverse'}`}>
            <span className="pin__dot shrink-0" />
            <span className="pin__line" style={{ width: reach }} />
            <span
              className={`rounded-lg bg-paper/85 px-2 py-1 backdrop-blur-sm ${isRight ? 'text-left' : 'text-right'}`}
            >
              <span className="mono block text-[10px] uppercase tracking-[0.14em] text-ink-2">
                {pin.label}
              </span>
              {pin.value && (
                <span className="block text-[15px] font-semibold tracking-tight text-ink">
                  {pin.value}
                </span>
              )}
            </span>
          </div>
        </div>
      )}
    </Html>
  );
}

export function Annotations({ compact }: { compact: boolean }) {
  const pins = compact ? PINS.filter((p) => p.mobile) : PINS;
  return (
    <group name="Annotations">
      {pins.map((pin) => (
        <PinLabel key={`${pin.chapter}-${pin.label}`} pin={pin} compact={compact} />
      ))}
    </group>
  );
}
