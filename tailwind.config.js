/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Golden Twilight Palette
        midnight: {
          DEFAULT: '#080C14',
          50:  '#0A0F1C',
          100: '#0E1625',
          200: '#121F38',
          300: '#1A2D4F',
          400: '#1E3A6E',
        },
        sapphire: {
          dark:    '#1D4ED8',
          DEFAULT: '#3B82F6',
          light:   '#60A5FA',
          glow:    '#93C5FD',
        },
        gold: {
          dark:    '#B45309',
          DEFAULT: '#F59E0B',
          bright:  '#FBBF24',
          glow:    '#FDE68A',
          spark:   '#FEF3C7',
        },
        surface: '#0E1625',
        card:    '#121F38',
        border:  '#1E3A6E',
        // Semantic
        danger:  '#F87171',
        success: '#34D399',
        warning: '#FBBF24',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        gold:     '0 0 20px rgba(245, 158, 11, 0.25)',
        'gold-lg':'0 0 40px rgba(245, 158, 11, 0.35)',
        sapphire: '0 0 20px rgba(59, 130, 246, 0.25)',
        card:     '0 4px 24px rgba(0,0,0,0.4)',
        glow:     '0 0 15px rgba(251, 191, 36, 0.4)',
      },
      backgroundImage: {
        'twilight': 'linear-gradient(135deg, #080C14 0%, #0E1625 50%, #121F38 100%)',
        'gold-shimmer': 'linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B)',
        'sapphire-glow': 'linear-gradient(135deg, #1D4ED8, #3B82F6)',
        'card-gradient': 'linear-gradient(145deg, #121F38, #0E1625)',
      },
      animation: {
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'slide-up':     'slideUp 0.3s ease-out',
        'slide-in':     'slideIn 0.25s ease-out',
        'bounce-score': 'bounceScore 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97)',
        'shimmer':      'shimmer 2s linear infinite',
        'fade-in':      'fadeIn 0.3s ease-out',
        'scale-in':     'scaleIn 0.2s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(245,158,11,0.2)' },
          '50%':      { boxShadow: '0 0 30px rgba(245,158,11,0.5)' },
        },
        slideUp: {
          from: { opacity: 0, transform: 'translateY(16px)' },
          to:   { opacity: 1, transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: 0, transform: 'translateX(-12px)' },
          to:   { opacity: 1, transform: 'translateX(0)' },
        },
        bounceScore: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%':      { transform: 'scale(1.15)' },
          '60%':      { transform: 'scale(0.95)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeIn: {
          from: { opacity: 0 },
          to:   { opacity: 1 },
        },
        scaleIn: {
          from: { opacity: 0, transform: 'scale(0.92)' },
          to:   { opacity: 1, transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}

