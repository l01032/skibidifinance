const c = (v) => `rgb(var(--${v}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('bg'),
        surface: c('surface'),
        raised: c('raised'),
        line: c('line'),
        fg: c('fg'),
        muted: c('muted'),
        accent: c('accent'),
        'accent-ink': c('accent-ink'),
        danger: c('danger'),
        warn: c('warn'),
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'none' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'none' } },
        sheet: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        'fade-in': 'fade-in .18s ease-out',
        'fade-up': 'fade-up .35s ease-out both',
        'scale-in': 'scale-in .18s ease-out',
        sheet: 'sheet .25s cubic-bezier(.2,.8,.2,1)',
      },
    },
  },
  plugins: [],
};
