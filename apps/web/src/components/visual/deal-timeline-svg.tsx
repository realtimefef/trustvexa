'use client';

/**
 * Animated SVG timeline showing the lifecycle of a deal — purely decorative.
 * Steps pulse left-to-right with flowing data lines.
 */
export function DealTimelineSvg() {
  const steps = [
    { label: 'Deal created', color: '#7c6ef7', x: 60 },
    { label: 'Funded on-chain', color: '#a78bfa', x: 180 },
    { label: 'Delivered', color: '#06b6d4', x: 300 },
    { label: 'Released', color: '#10b981', x: 420 },
  ];

  return (
    <svg
      viewBox="0 0 480 120"
      aria-hidden="true"
      className="w-full max-w-xl"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id="track" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7c6ef7" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Track line */}
      <line x1="60" y1="50" x2="420" y2="50" stroke="url(#track)" strokeWidth="2" />

      {/* Animated traveling dot */}
      <circle r="4" fill="#a78bfa" filter="url(#glow)" opacity="0.9">
        <animateMotion dur="3s" repeatCount="indefinite" path="M60,50 L420,50" />
      </circle>

      {steps.map((s, i) => (
        <g key={s.label}>
          {/* Ring */}
          <circle cx={s.x} cy={50} r={14} fill="none" stroke={s.color} strokeWidth="1.5" opacity="0.3">
            <animate attributeName="r" values="14;18;14" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.3;0.05;0.3" dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
          </circle>
          {/* Core dot */}
          <circle cx={s.x} cy={50} r={7} fill={s.color} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.6;1" dur={`${1.8 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>
          {/* Number */}
          <text x={s.x} y={53} textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">{i + 1}</text>
          {/* Label */}
          <text x={s.x} y={80} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.6">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}
