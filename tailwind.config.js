/** @type {import('tailwindcss').Config} */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Semantic colours; values live in CSS variables (src/index.css) so light/dark share one set of classes.
      colors: {
        base: token('base'),
        surface: token('surface'),
        raised: token('raised'),
        line: token('line'),
        ink: token('ink'),
        mute: token('mute'),
        faint: token('faint'),
        accent: { DEFAULT: token('accent'), ink: token('accent-ink') },
        danger: { DEFAULT: token('danger'), ink: '#ffffff' },
        gold: token('gold'),
      },
      boxShadow: {
        glow: '0 10px 30px -10px rgb(var(--accent) / 0.55)',
        panel: '0 1px 0 rgb(255 255 255 / 0.03) inset, 0 20px 40px -24px rgb(0 0 0 / 0.5)',
      },
    },
  },
  plugins: [],
}
