import { Eye, KeyRound, Lock, ScrollText } from 'lucide-react';

/** Animated security shield SVG with orbiting protection icons. aria-hidden. */
export function ShieldVisual() {
  return (
    <div className="relative aspect-square w-full max-w-sm" aria-hidden="true">
      <div className="absolute inset-[18%] rounded-full bg-brand-gradient opacity-20 blur-3xl" />

      <svg viewBox="0 0 200 200" className="relative h-full w-full">
        <defs>
          <linearGradient
            id="shield-g"
            x1="0"
            y1="0"
            x2="200"
            y2="200"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="hsl(var(--brand-1))" />
            <stop offset="0.5" stopColor="hsl(var(--brand-2))" />
            <stop offset="1" stopColor="hsl(var(--brand-3))" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="92" fill="none" stroke="hsl(var(--border))" strokeWidth="1" />
        <circle
          cx="100"
          cy="100"
          r="70"
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="4 6"
          className="origin-center animate-spin-slow"
        />
        <path
          d="M100 34l44 16v33c0 28-18 51-44 66-26-15-44-38-44-66V50l44-16z"
          fill="url(#shield-g)"
          className="drop-shadow-[0_8px_24px_hsl(var(--primary)/0.45)]"
        />
        <path
          d="M82 100l13 13 26-28"
          fill="none"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Orbiting protection chips */}
      {[
        { Icon: Lock, cls: 'left-1/2 top-0 -translate-x-1/2' },
        { Icon: KeyRound, cls: 'right-0 top-1/2 -translate-y-1/2' },
        { Icon: Eye, cls: 'left-1/2 bottom-0 -translate-x-1/2' },
        { Icon: ScrollText, cls: 'left-0 top-1/2 -translate-y-1/2' },
      ].map(({ Icon, cls }, i) => (
        <span
          key={i}
          className={`absolute ${cls} flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/90 text-primary shadow-card backdrop-blur`}
          style={{ animation: `float 6s ease-in-out ${i * 0.5}s infinite` }}
        >
          <Icon className="h-5 w-5" />
        </span>
      ))}
    </div>
  );
}
