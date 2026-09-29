import { useEffect, useRef, useState, type FormEvent } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { BRAND, COLORWAYS, formatPrice } from '../../config/product';
import { scrollToTarget } from '../../hooks/useSmoothScroll';
import { Logo } from './SiteHeader';

gsap.registerPlugin(ScrollTrigger);

/* ================================================================== *
 * Everything after the 3D story. It scrolls up over the fixed canvas
 * like a sheet of paper — hence the rounded top edge and soft shadow.
 * ================================================================== */

const REVIEWS = [
  {
    quote:
      'Did a half marathon in them straight out of the box. Wouldn’t recommend that with any shoe, but my feet were fine, which is more than I can say for my legs.',
    name: 'Priya S.',
    where: 'Leeds',
    km: 412,
    colour: 'Harbour',
  },
  {
    quote:
      'I bought Signal because I run at 6 p.m. in November. Two different drivers have waved at me. That never happened before.',
    name: 'Tomás R.',
    where: 'Porto',
    km: 638,
    colour: 'Signal',
  },
  {
    quote:
      'Not the bounciest shoe I own. It is the one I actually reach for. Half size up if you wear thick socks — I didn’t and it was snug for a week.',
    name: 'Hannah K.',
    where: 'Minneapolis',
    km: 290,
    colour: 'Dune',
  },
];

const SPEC_ROWS: [string, string][] = [
  ['Weight', '248 g (US men’s 9) · 214 g (US women’s 8)'],
  ['Stack height', '34 mm heel · 26 mm forefoot · 8 mm drop'],
  ['Upper', 'Single-layer engineered knit, 81% recycled polyester'],
  ['Midsole', 'Supercritical EVA foam, one density, no plate'],
  ['Outsole', 'Full-length rubber, 3 mm lugs, softer heel crash pad'],
  ['Fit', 'True to size. Between sizes or thick socks? Go half up.'],
  ['Good for', 'Easy runs, long runs, the walk to the café afterwards'],
  ['Not for', 'Trails with actual mud. We’re working on that one.'],
  ['Care', 'Hand wash cold, air dry. Not the tumble dryer — we’ve seen what happens.'],
];

const POSTS = [
  {
    tag: 'Design',
    title: 'Why we left the carbon plate out',
    blurb: 'Plates are brilliant on race day. We wanted a shoe for the other six.',
    date: 'Sep 12, 2026',
    read: '6 min',
    tone: COLORWAYS[0],
  },
  {
    tag: 'Field notes',
    title: 'Seven 5 a.m. runs in Porto, in the rain',
    blurb: 'What a week of wet granite taught us about outsole rubber.',
    date: 'Aug 28, 2026',
    read: '9 min',
    tone: COLORWAYS[2],
  },
  {
    tag: 'Advice',
    title: 'How to tell when your shoes are done',
    blurb: 'It’s rarely the kilometres. Press your thumb into the midsole and read on.',
    date: 'Aug 03, 2026',
    read: '4 min',
    tone: COLORWAYS[1],
  },
];

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el.querySelectorAll('[data-reveal]'), {
        y: 28,
        autoAlpha: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: el, start: 'top 78%', once: true },
      });
    }, el);
    return () => ctx.revert();
  }, []);
  return ref;
}

function Stars() {
  return (
    <span className="flex gap-0.5 text-ink" aria-label="5 out of 5">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} width="13" height="13" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M10 1.5l2.6 5.5 6 .7-4.5 4.1 1.2 5.9L10 14.8l-5.3 2.9 1.2-5.9L1.4 7.7l6-.7z"
          />
        </svg>
      ))}
    </span>
  );
}

function Reviews() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="reviews" ref={ref} className="mx-auto max-w-page px-6 py-24 sm:px-10 md:py-36">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-4" data-reveal>
          <p className="eyebrow">Worn in</p>
          <h2 className="h2 mt-5">
            4.8 out of 5, from <span className="serif italic font-normal">2,314</span> people who
            run more than we do.
          </h2>
          <p className="body-copy mt-5 max-w-sm">
            We don’t edit reviews, and we don’t send free pairs in exchange for them. The kilometres
            are from the reviewer’s own log.
          </p>
        </div>
        <ul className="grid gap-4 md:col-span-8 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <li
              key={r.name}
              data-reveal
              className="flex flex-col justify-between rounded-3xl bg-paper-2 p-6 ring-1 ring-line"
            >
              <div>
                <Stars />
                <blockquote className="mt-4 text-[15px] leading-relaxed">“{r.quote}”</blockquote>
              </div>
              <footer className="mt-8 flex items-end justify-between border-t border-line pt-4 text-sm">
                <span>
                  <span className="font-medium">{r.name}</span>
                  <span className="block text-ink-2">
                    {r.where} · {r.colour}
                  </span>
                </span>
                <span className="mono text-right text-[11px] uppercase tracking-[0.12em] text-ink-2">
                  <span className="block text-base font-medium normal-case tracking-tight text-ink tabular-nums">
                    {r.km} km
                  </span>
                  logged
                </span>
              </footer>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function SpecSheet() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="specs" ref={ref} className="border-y border-line bg-paper-2">
      <div className="mx-auto grid max-w-page gap-10 px-6 py-24 sm:px-10 md:grid-cols-12 md:py-32">
        <div className="md:col-span-4" data-reveal>
          <p className="eyebrow">Spec sheet</p>
          <h2 className="h2 mt-5">
            The boring <span className="serif italic font-normal">(important)</span> part.
          </h2>
          <button
            type="button"
            className="btn-ink mt-8"
            onClick={() => {
              const buy = document.getElementById('chapter-buy');
              if (buy) scrollToTarget(buy);
            }}
          >
            Choose your size
          </button>
        </div>
        <dl className="md:col-span-8">
          {SPEC_ROWS.map(([k, v]) => (
            <div
              key={k}
              data-reveal
              className="grid grid-cols-1 gap-1 border-t border-line py-4 first:border-t-0 sm:grid-cols-[180px_1fr] sm:gap-6"
            >
              <dt className="mono text-[11px] uppercase tracking-[0.14em] text-ink-2 sm:pt-1">
                {k}
              </dt>
              <dd className="text-[15px] sm:text-base">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Journal() {
  const ref = useReveal<HTMLElement>();
  return (
    <section id="journal" ref={ref} className="mx-auto max-w-page px-6 py-24 sm:px-10 md:py-36">
      <div className="flex items-end justify-between gap-6" data-reveal>
        <div>
          <p className="eyebrow">Journal</p>
          <h2 className="h2 mt-5">Notes from the road.</h2>
        </div>
        <a href="#journal" className="link-underline hidden text-sm sm:inline">
          All stories
        </a>
      </div>
      <ul className="mt-12 grid gap-6 md:grid-cols-3">
        {POSTS.map((p, i) => (
          <li key={p.title} data-reveal>
            <a href="#journal" className="group block">
              <div
                className="relative aspect-[4/3] overflow-hidden rounded-3xl"
                style={{ background: p.tone.tint }}
              >
                <span
                  className="serif absolute -bottom-8 right-4 select-none text-[11rem] italic leading-none transition-transform duration-500 group-hover:-translate-y-2"
                  style={{ color: p.tone.accent, opacity: 0.85 }}
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mono absolute left-5 top-5 rounded-full bg-paper/80 px-3 py-1 text-[10px] uppercase tracking-[0.14em]">
                  {p.tag}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-semibold tracking-tight group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
                {p.title}
              </h3>
              <p className="mt-2 text-[15px] text-ink-2">{p.blurb}</p>
              <p className="mono mt-3 text-[11px] uppercase tracking-[0.12em] text-ink-3">
                {p.date} · {p.read}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'error' | 'done'>('idle');

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setState('error');
      return;
    }
    setState('done');
  };

  return (
    <section className="mx-auto max-w-page px-6 pb-24 sm:px-10">
      <div className="grid gap-8 rounded-[32px] bg-ink px-6 py-12 text-paper sm:px-12 md:grid-cols-2 md:items-center md:py-16">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Occasional emails. <span className="serif italic font-normal">Mostly</span> about
            running.
          </h2>
          <p className="mt-3 text-[15px] text-paper/60">
            About once a month. Sometimes about socks. Unsubscribe whenever — no hard feelings.
          </p>
        </div>
        {state === 'done' ? (
          <p className="text-lg" role="status">
            You’re on the list. First one lands next month.
          </p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:flex-row">
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === 'error') setState('idle');
              }}
              aria-invalid={state === 'error'}
              aria-describedby="email-hint"
              className="h-12 flex-1 rounded-full bg-paper/10 px-5 text-paper placeholder:text-paper/40 focus:bg-paper/15 focus:outline-none focus:ring-1 focus:ring-paper/50"
            />
            <button type="submit" className="btn h-12 bg-paper px-6 text-ink hover:bg-paper/90">
              Sign me up
            </button>
            <p id="email-hint" className="sr-only" aria-live="polite">
              {state === 'error' ? 'That email doesn’t look quite right.' : ''}
            </p>
          </form>
        )}
        {state === 'error' && (
          <p className="-mt-4 text-sm text-paper/70 md:col-start-2">
            That email doesn’t look quite right.
          </p>
        )}
      </div>
    </section>
  );
}

function Footer() {
  const cols: [string, string[]][] = [
    ['Shop', ['Model 01', 'Socks', 'Gift cards', 'Store finder']],
    ['Help', ['Shipping', 'Returns', 'Size guide', 'Contact']],
    ['Kestrel', ['About', 'Journal', 'Repairs', 'Careers']],
  ];
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-page gap-10 px-6 py-16 sm:px-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-ink-2">
            Running shoes for ordinary days. Designed in Porto, tested wherever it’s raining.
          </p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title} className="md:col-span-2">
            <p className="eyebrow">{title}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {links.map((l) => (
                <li key={l}>
                  <a href="#top" className="link-underline">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-page flex-col gap-2 border-t border-line px-6 py-6 text-xs text-ink-3 sm:flex-row sm:justify-between sm:px-10">
        <p>
          © {new Date().getFullYear()} {BRAND.company} — a fictional brand. {BRAND.model} from{' '}
          {formatPrice(BRAND.price)}.
        </p>
        <p>
          3D model: “Materials Variants Shoe” by Shopify,{' '}
          <a
            className="underline underline-offset-2 hover:text-ink"
            href="https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          .
        </p>
      </div>
    </footer>
  );
}

export function AfterStory() {
  return (
    <main
      id="after"
      className="relative z-20 -mt-8 rounded-t-[32px] bg-paper shadow-[0_-24px_60px_-30px_rgba(20,20,20,0.25)]"
    >
      <Reviews />
      <SpecSheet />
      <Journal />
      <Newsletter />
      <Footer />
    </main>
  );
}
