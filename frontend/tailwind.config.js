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
        ink: {
          DEFAULT: '#221C1D',
          light: '#3A2F30',
        },
        paper: {
          DEFAULT: '#FBF4F0',
          card: '#FFFCFA',
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
