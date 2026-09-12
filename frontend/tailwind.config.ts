import type { Config } from 'tailwindcss'

// Themed tokens are stored as "R G B" triplets in CSS custom properties (see
// index.css) so Tailwind's opacity modifiers (bg-gold/20, border-border/50…)
// keep working — this returns a Tailwind color function backed by that var.
function themed(varName: string) {
  return ({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `rgb(var(${varName}))`
      : `rgb(var(${varName}) / ${opacityValue})`
}

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core brand palette — swaps per theme via CSS variables (see index.css)
        void:    themed('--color-void-rgb'),
        deep:    themed('--color-deep-rgb'),
        surface: themed('--color-surface-rgb'),
        card:    themed('--color-card-rgb'),
        border:  themed('--color-border-rgb'),
        muted:   themed('--color-muted-rgb'),
        subtle:  themed('--color-subtle-rgb'),
        // Text
        dim:     themed('--color-dim-rgb'),
        body:    themed('--color-body-rgb'),
        bright:  themed('--color-bright-rgb'),
        // Brand gold
        gold:    themed('--color-gold-rgb'),
        'gold-light': '#fcd34d',
        'gold-dark':  '#b45309',
        // Accent purple
        arcane:  '#7c3aed',
        'arcane-light': '#a855f7',
        'arcane-dark':  '#5b21b6',
        // Status
        success: '#10b981',
        warning: '#f59e0b',
        danger:  '#ef4444',
        info:    '#3b82f6',
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        mono:  ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient':    'radial-gradient(ellipse at 50% 0%, rgb(var(--color-deep-alt-rgb)) 0%, rgb(var(--color-void-rgb)) 60%)',
        'card-gradient':    'linear-gradient(135deg, rgb(var(--color-card-rgb)) 0%, rgb(var(--color-surface-rgb)) 100%)',
        'gold-gradient':    'linear-gradient(135deg, #f59e0b 0%, #fcd34d 100%)',
        'arcane-gradient':  'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)',
        'glow-gold':        'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glow-gold':   '0 0 30px rgba(245,158,11,0.2), 0 0 60px rgba(245,158,11,0.1)',
        'glow-arcane': '0 0 30px rgba(124,58,237,0.2), 0 0 60px rgba(124,58,237,0.1)',
        'card':        '0 4px 24px rgba(0,0,0,0.4)',
        'card-hover':  '0 8px 40px rgba(0,0,0,0.6), 0 0 20px rgba(245,158,11,0.1)',
      },
      animation: {
        'fade-in':      'fadeIn 0.4s ease-out',
        'slide-up':     'slideUp 0.4s ease-out',
        'slide-down':   'slideDown 0.3s ease-out',
        'pulse-gold':   'pulseGold 2s ease-in-out infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'shimmer':      'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:    { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:  { from: { opacity: '0', transform: 'translateY(-16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGold:  { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '1' } },
        glow:       { from: { boxShadow: '0 0 10px rgba(245,158,11,0.1)' }, to: { boxShadow: '0 0 30px rgba(245,158,11,0.3)' } },
        shimmer:    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config
