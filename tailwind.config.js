/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        accent: {
          50: '#d1e7dd',
          100: '#c1dfd5',
          200: '#a8d5c8',
          300: '#4ade80',
          400: '#22c55e',
          500: '#0f5132',
          600: '#0a3d24',
          700: '#063d2d',
          800: '#052e16',
          900: '#041307',
        },
        danger: {
          50: '#f8d7da',
          100: '#f5c2c7',
          500: '#b02a37',
          600: '#a02834',
          700: '#8b1f2a',
        },
        warning: {
          500: '#b8860b',
          600: '#996b08',
        },
        gold: {
          400: '#d4af37',
          500: '#c8a44d',
        },
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease',
        'toast-in': 'toastIn 0.3s ease',
        'toast-out': 'toastOut 0.3s ease 2.7s forwards',
        'trophy-bounce': 'trophyBounce 1s ease infinite alternate',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateX(100%)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        toastOut: {
          to: { opacity: '0', transform: 'translateX(100%)' },
        },
        trophyBounce: {
          from: { transform: 'translateY(0) rotate(-5deg)' },
          to: { transform: 'translateY(-8px) rotate(5deg)' },
        },
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.06)',
        'md': '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        'lg': '0 12px 32px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
