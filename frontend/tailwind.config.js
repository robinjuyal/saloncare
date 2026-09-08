/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter var', 'system-ui', 'sans-serif'],
        // ── Salon theme (customer-facing pages) ──
        display: ['"Fraunces"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        // ── Salon theme tokens ──
        // True black/white + rose as the single accent, mirroring a
        // reference design (Claude's own pricing page) the client asked
        // to match closely: near-black text, pure white surfaces
        // distinguished only by a thin border (no tint difference between
        // page and card backgrounds), one accent color used sparingly.
        // brass/sage are kept defined (unused Tailwind utilities cost
        // nothing in the built CSS) in case a future design wants them
        // back — nothing in the app currently references them.
        ink: {
          DEFAULT: '#171717',
          light: '#404040',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          card: '#FFFFFF',
        },
        rose: {
          DEFAULT: '#E8425F',
          dark: '#C22E48',
          light: '#FCE4E8',
        },
        brass: {
          DEFAULT: '#B9973F',
          light: '#F3EBD4',
          bright: '#E8C468',
        },
        sage: {
          DEFAULT: '#4B6355',
          light: '#E7EEE9',
          bright: '#8FBFA3',
        },
      },
    },
  },
  plugins: [],
}
