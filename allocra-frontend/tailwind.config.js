/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Sidebar / Shell
        void:   '#0C0C0B',
        'void-2': '#161614',
        'void-3': '#1F1F1C',
        'void-4': '#2A2A26',
        'void-border': '#2E2E2A',

        // Content area
        stone:  '#F7F5F1',
        surface: '#FFFFFF',

        // Borders
        border:  '#E5E1D8',
        'border-2': '#CCC8BE',

        // Text
        ink:   '#18181A',
        'ink-2': '#52525C',
        'ink-3': '#9D9DA6',

        // Accent — distinctive violet
        violet: {
          DEFAULT: '#7C5CFC',
          hover:   '#6946F0',
          muted:   '#F4F1FF',
          subtle:  '#EAE4FF',
          dim:     '#4B3899',
        },

        // Status
        emerald: { DEFAULT: '#10B981', bg: '#F0FDF9', border: '#A7F3D0' },
        amber:   { DEFAULT: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
        rose:    { DEFAULT: '#F43F5E', bg: '#FFF1F3', border: '#FECDD3' },
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        xs:   '0 1px 2px rgba(0,0,0,0.05)',
        card: '0 1px 4px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
        lift: '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04)',
        drop: '0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
        modal:'0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.08)',
        glow: '0 0 0 3px rgba(124,92,252,0.15)',
      },
      animation: {
        'fade':       'fade 0.18s ease-out',
        'slide-up':   'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
        'slide-down': 'slideDown 0.18s cubic-bezier(0.16,1,0.3,1)',
        'slide-right':'slideRight 0.22s cubic-bezier(0.16,1,0.3,1)',
        'scale-in':   'scaleIn 0.15s cubic-bezier(0.16,1,0.3,1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.6s ease-in-out infinite',
        'count-up':   'countUp 0.6s cubic-bezier(0.16,1,0.3,1)',
      },
      keyframes: {
        fade:      { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideRight:{ from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        scaleIn:   { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        countUp:   { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}
