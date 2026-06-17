import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

// Tailwind + shadcn/ui design tokens. Colors map to CSS variables defined in
// src/app/globals.css so dark/light themes (next-themes) swap automatically.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '2rem',
        md: '3.5rem',
        lg: '5rem',
        xl: '7rem',
        '2xl': '9rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        brand: {
          1: 'hsl(var(--brand-1))',
          2: 'hsl(var(--brand-2))',
          3: 'hsl(var(--brand-3))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        '2xl': 'calc(var(--radius) + 6px)',
        xl: 'calc(var(--radius) + 2px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        glow: '0 0 0 1px hsl(var(--primary) / 0.1), 0 8px 40px -12px hsl(var(--primary) / 0.45)',
        'glow-lg': '0 20px 70px -20px hsl(var(--primary) / 0.5)',
        soft: '0 1px 2px hsl(222 47% 11% / 0.04), 0 8px 24px -8px hsl(222 47% 11% / 0.12)',
        card: '0 1px 0 0 hsl(0 0% 100% / 0.6) inset, 0 10px 30px -12px hsl(222 47% 11% / 0.18)',
      },
      backgroundImage: {
        'brand-gradient':
          'linear-gradient(120deg, hsl(var(--brand-1)), hsl(var(--brand-2)), hsl(var(--brand-3)))',
        'radial-fade':
          'radial-gradient(60% 60% at 50% 0%, hsl(var(--primary) / 0.22) 0%, transparent 70%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px) translateX(0px)' },
          '33%': { transform: 'translateY(-22px) translateX(10px)' },
          '66%': { transform: 'translateY(12px) translateX(-12px)' },
        },
        'text-shine': {
          to: { backgroundPosition: '200% center' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '100%': { transform: 'scale(2.2)', opacity: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'border-beam': {
          '100%': { 'offset-distance': '100%' },
        },
        aurora: {
          '0%, 100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(30px,-40px) scale(1.1)' },
          '66%': { transform: 'translate(-20px,20px) scale(0.95)' },
        },
        'orbit-1': {
          '0%':   { transform: 'rotate(0deg)   translateX(110px) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(110px) rotate(-360deg)' },
        },
        'orbit-2': {
          '0%':   { transform: 'rotate(120deg)   translateX(80px) rotate(-120deg)' },
          '100%': { transform: 'rotate(480deg)   translateX(80px) rotate(-480deg)' },
        },
        'orbit-3': {
          '0%':   { transform: 'rotate(240deg)   translateX(140px) rotate(-240deg)' },
          '100%': { transform: 'rotate(600deg)   translateX(140px) rotate(-600deg)' },
        },
        'card-float-a': {
          '0%, 100%': { transform: 'translateY(0px) rotate(-3deg)' },
          '50%':       { transform: 'translateY(-18px) rotate(-3deg)' },
        },
        'card-float-b': {
          '0%, 100%': { transform: 'translateY(-8px) rotate(4deg)' },
          '50%':       { transform: 'translateY(10px) rotate(4deg)' },
        },
        'card-float-c': {
          '0%, 100%': { transform: 'translateY(4px) rotate(-1deg)' },
          '50%':       { transform: 'translateY(-12px) rotate(-1deg)' },
        },
        'ticker-slide': {
          '0%':   { transform: 'translateY(100%)', opacity: '0' },
          '15%':  { transform: 'translateY(0)',    opacity: '1' },
          '85%':  { transform: 'translateY(0)',    opacity: '1' },
          '100%': { transform: 'translateY(-100%)',opacity: '0' },
        },
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px 4px hsl(var(--primary) / 0.25)' },
          '50%':       { boxShadow: '0 0 40px 10px hsl(var(--primary) / 0.5)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-up': 'fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.8s ease both',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 14s ease-in-out infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        marquee: 'marquee 40s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'pulse-ring': 'pulse-ring 2.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        shimmer: 'shimmer 2s infinite',
        aurora: 'aurora 18s ease-in-out infinite',
        'orbit-1': 'orbit-1 14s linear infinite',
        'orbit-2': 'orbit-2 20s linear infinite',
        'orbit-3': 'orbit-3 25s linear infinite',
        'card-float-a': 'card-float-a 7s ease-in-out infinite',
        'card-float-b': 'card-float-b 9s ease-in-out infinite',
        'card-float-c': 'card-float-c 11s ease-in-out infinite',
        'ticker-slide': 'ticker-slide 3.5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
