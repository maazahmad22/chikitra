/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './pages/**/*.html',
    './assets/js/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      colors: {
        // Brand — teal healthcare palette
        brand: {
          50:  '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6', // primary accent
          600: '#0F766E', // primary
          700: '#115E59', // primary hover
          800: '#134E4A',
          900: '#0F3D3A',
        },
        nav: {
          DEFAULT: '#111827', // dark navigation
          soft: '#1B2432',
          line: '#232C3B',
          text: '#9CA6B8',
        },
        canvas: '#F8FAFC',
        ink: '#1E293B',
        muted: '#64748B',
        line: '#E5E7EB',
        success: '#22C55E',
        warning: '#F59E0B',
        danger:  '#EF4444',
        info:    '#3B82F6',
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        lift: '0 4px 12px -2px rgb(16 24 40 / 0.08), 0 2px 6px -2px rgb(16 24 40 / 0.06)',
        panel: '-8px 0 32px -8px rgb(16 24 40 / 0.14)',
        pop: '0 12px 40px -8px rgb(16 24 40 / 0.18)',
      },
      borderRadius: {
        card: '10px',
      },
      transitionDuration: {
        DEFAULT: '200ms',
        250: '250ms',
      },
      keyframes: {
        'fade-in':   { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in':  { '0%': { opacity: '0', transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'slide-left':{ '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        'slide-right':{ '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(0)' } },
        'toast-in':  { '0%': { opacity: '0', transform: 'translateY(10px) scale(.97)' }, '100%': { opacity: '1', transform: 'translateY(0) scale(1)' } },
        'toast-out': { '0%': { opacity: '1' }, '100%': { opacity: '0', transform: 'translateY(6px)' } },
        'shimmer':   { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'scale-in': 'scale-in 200ms cubic-bezier(.2,.8,.3,1) both',
        'slide-left': 'slide-left 250ms cubic-bezier(.2,.8,.3,1) both',
        'slide-right': 'slide-right 250ms cubic-bezier(.2,.8,.3,1) both',
        'toast-in': 'toast-in 200ms cubic-bezier(.2,.8,.3,1) both',
        'toast-out': 'toast-out 180ms ease-in both',
      },
    },
  },
  plugins: [],
};
