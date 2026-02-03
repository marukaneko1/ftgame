/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      /* === COLORS === */
      colors: {
        // Base backgrounds
        base: 'var(--color-bg-base)',
        raised: 'var(--color-bg-raised)',
        elevated: 'var(--color-bg-elevated)',
        overlay: 'var(--color-bg-overlay)',
        
        // Surfaces
        surface: {
          primary: 'var(--color-surface-primary)',
          secondary: 'var(--color-surface-secondary)',
          tertiary: 'var(--color-surface-tertiary)',
        },
        
        // Text
        txt: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          muted: 'var(--color-text-muted)',
        },
        
        // Borders
        border: {
          subtle: 'var(--color-border-subtle)',
          DEFAULT: 'var(--color-border-default)',
          strong: 'var(--color-border-strong)',
          focus: 'var(--color-border-focus)',
        },
        
        // Primary Accent (Electric Purple)
        accent: {
          DEFAULT: 'var(--color-accent-primary)',
          hover: 'var(--color-accent-primary-hover)',
          muted: 'var(--color-accent-primary-muted)',
          glow: 'var(--color-accent-primary-glow)',
        },
        
        // Secondary Accent (Cyan)
        cyan: {
          DEFAULT: 'var(--color-accent-secondary)',
          hover: 'var(--color-accent-secondary-hover)',
          muted: 'var(--color-accent-secondary-muted)',
          glow: 'var(--color-accent-secondary-glow)',
        },
        
        // Semantic
        success: {
          DEFAULT: 'var(--color-success)',
          muted: 'var(--color-success-muted)',
        },
        warning: {
          DEFAULT: 'var(--color-warning)',
          muted: 'var(--color-warning-muted)',
        },
        error: {
          DEFAULT: 'var(--color-error)',
          muted: 'var(--color-error-muted)',
        },
        info: {
          DEFAULT: 'var(--color-info)',
          muted: 'var(--color-info-muted)',
        },
        
        // Special
        gold: {
          DEFAULT: 'var(--color-gold)',
          glow: 'var(--color-gold-glow)',
        },
        
        // Glass
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },
      },
      
      /* === SPACING === */
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '6': 'var(--space-6)',
        '8': 'var(--space-8)',
        '12': 'var(--space-12)',
        '16': 'var(--space-16)',
        '24': 'var(--space-24)',
      },
      
      /* === BORDER RADIUS === */
      borderRadius: {
        'sm': 'var(--radius-sm)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        'pill': 'var(--radius-pill)',
      },
      
      /* === BOX SHADOW === */
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'glow-purple': 'var(--shadow-glow-purple)',
        'glow-cyan': 'var(--shadow-glow-cyan)',
        'glow-gold': 'var(--shadow-glow-gold)',
      },
      
      /* === TYPOGRAPHY === */
      fontFamily: {
        'display': ['var(--font-display)'],
        'body': ['var(--font-body)'],
        'mono': ['var(--font-mono)'],
      },
      
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: 'var(--leading-snug)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-tight)' }],
      },
      
      letterSpacing: {
        'tighter': 'var(--tracking-tighter)',
        'tight': 'var(--tracking-tight)',
        'normal': 'var(--tracking-normal)',
        'wide': 'var(--tracking-wide)',
        'wider': 'var(--tracking-wider)',
        'widest': 'var(--tracking-widest)',
      },
      
      lineHeight: {
        'tight': 'var(--leading-tight)',
        'snug': 'var(--leading-snug)',
        'normal': 'var(--leading-normal)',
        'relaxed': 'var(--leading-relaxed)',
      },
      
      /* === TRANSITIONS === */
      transitionDuration: {
        'fast': 'var(--duration-fast)',
        'normal': 'var(--duration-normal)',
        'slow': 'var(--duration-slow)',
      },
      
      transitionTimingFunction: {
        'default': 'var(--easing-default)',
        'bounce': 'var(--easing-bounce)',
      },
      
      /* === BACKDROP BLUR === */
      backdropBlur: {
        'glass': 'var(--glass-blur)',
      },
      
      /* === ANIMATIONS === */
      animation: {
        'fade-in': 'fade-in var(--duration-normal) var(--easing-default)',
        'slide-up': 'slide-up var(--duration-normal) var(--easing-default)',
        'slide-down': 'slide-down var(--duration-normal) var(--easing-default)',
        'scale-in': 'scale-in var(--duration-normal) var(--easing-default)',
        'shimmer': 'shimmer 2s infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          from: { opacity: '0', transform: 'translateY(-10px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px var(--color-accent-primary-glow)' },
          '50%': { boxShadow: '0 0 30px var(--color-accent-primary-glow), 0 0 50px var(--color-accent-primary-muted)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
