'use client';

/**
 * 3D blockchain globe with orbiting chain nodes.
 * Pure CSS / Tailwind — no canvas or WebGL required.
 */
export function BlockchainGlobe() {
  const nodes = [
    { label: 'ETH',  color: 'bg-blue-500',   ring: 'animate-orbit-1', size: 'h-9 w-9'  },
    { label: 'BNB',  color: 'bg-yellow-400', ring: 'animate-orbit-2', size: 'h-8 w-8'  },
    { label: 'SOL',  color: 'bg-purple-500', ring: 'animate-orbit-3', size: 'h-8 w-8'  },
    { label: 'TRX',  color: 'bg-red-500',    ring: 'animate-orbit-1 animation-delay-400', size: 'h-7 w-7' },
    { label: 'USDT', color: 'bg-emerald-500',ring: 'animate-orbit-2 animation-delay-800', size: 'h-9 w-9' },
  ];

  return (
    <div className="relative mx-auto flex h-72 w-72 items-center justify-center md:h-80 md:w-80" aria-hidden="true">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-primary/10 blur-3xl animate-glow-pulse" />

      {/* Globe body */}
      <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-primary/30 bg-card/80 shadow-glow backdrop-blur-xl">
        {/* Inner grid lines */}
        <div className="absolute inset-2 rounded-full border border-primary/15" />
        <div className="absolute inset-4 rounded-full border border-primary/10" />
        {/* Equator line */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-px w-full bg-primary/20" />
        </div>
        {/* Meridian line */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-px bg-primary/20" />
        </div>
        {/* Center dot */}
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-brand-gradient text-white shadow-glow animate-spin-slow">
          <span className="font-display text-[10px] font-bold leading-tight text-center">TRUST<br/>VEXA</span>
        </div>
        {/* Rotating rim */}
        <div className="absolute inset-0 rounded-full border border-dashed border-primary/20 animate-spin-slow [animation-duration:30s]" />
      </div>

      {/* Orbiting nodes */}
      <div className="absolute inset-0 flex items-center justify-center">
        {nodes.map((node) => (
          <div key={node.label} className={`absolute ${node.ring}`}>
            <div className={`flex ${node.size} items-center justify-center rounded-xl ${node.color} font-mono text-[9px] font-bold text-white shadow-lg border border-white/20`}>
              {node.label}
            </div>
          </div>
        ))}
      </div>

      {/* Orbital rings (decorative) */}
      <div className="absolute h-56 w-56 rounded-full border border-primary/10 border-dashed" />
      <div className="absolute h-44 w-44 rounded-full border border-primary/10" style={{ transform: 'rotateX(75deg)' }} />
    </div>
  );
}
