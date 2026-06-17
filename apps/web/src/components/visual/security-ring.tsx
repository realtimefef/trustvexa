'use client';

/**
 * Animated SVG circular security ring — pure SVG with CSS animations.
 * Shows a fully-filled gradient ring with pulsing outer arcs.
 */
export function SecurityRing() {
  const r = 72;
  const circ = 2 * Math.PI * r;
  const filled = circ * 1; // full ring — no fake score

  return (
    <div className="relative flex h-[160px] w-[160px] items-center justify-center sm:h-[200px] sm:w-[200px]">
      {/* Outer glow rings */}
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          className="absolute inset-0 rounded-full border border-primary/20"
          style={{
            animation: `pulse-ring ${1.8 + n * 0.6}s cubic-bezier(0.215,0.61,0.355,1) ${n * 0.4}s infinite`,
          }}
        />
      ))}

      <svg
        viewBox="0 0 160 160"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full -rotate-90"
      >
        {/* Background track */}
        <circle cx="80" cy="80" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
        {/* Filled arc */}
        <circle
          cx="80" cy="80" r={r}
          fill="none"
          stroke="url(#score-grad)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset="0"
        >
          <animate attributeName="stroke-dasharray" from={`0 ${circ}`} to={`${filled} ${circ}`} dur="1.8s" fill="freeze" />
        </circle>
        <defs>
          <linearGradient id="score-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--brand-1))" />
            <stop offset="100%" stopColor="hsl(var(--brand-3))" />
          </linearGradient>
        </defs>
      </svg>

      {/* Centre text */}
      <div className="relative flex flex-col items-center gap-0.5">
        <span className="font-display text-base font-bold tracking-tight text-gradient leading-tight text-center">End-to-end<br />Encrypted</span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">AES-256-GCM</span>
      </div>
    </div>
  );
}
