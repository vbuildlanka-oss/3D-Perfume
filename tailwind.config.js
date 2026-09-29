/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Mirrors the :root variables in src/index.css.
      colors: {
        paper: 'rgb(var(--paper-rgb) / <alpha-value>)',
        'paper-2': 'var(--paper-2)',
        'paper-3': 'var(--paper-3)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        line: 'var(--line)',
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        'accent-tint': 'var(--accent-tint)',
      },
      fontFamily: {
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      maxWidth: {
        page: '1360px',
      },
    },
  },
  plugins: [],
};
