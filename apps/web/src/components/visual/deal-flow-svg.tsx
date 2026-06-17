/**
 * Animated SVG showing the escrow deal flow:
 * Buyer → Escrow (lock) → Seller  with animated fund-flow path.
 * Pure decorative, aria-hidden.
 */
export function DealFlowSvg() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-lg select-none">
      <svg viewBox="0 0 480 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <defs>
          <linearGradient id="flow-g" x1="0" y1="0" x2="480" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="hsl(var(--brand-1))" />
            <stop offset="0.5" stopColor="hsl(var(--brand-2))" />
            <stop offset="1" stopColor="hsl(var(--brand-3))" />
          </linearGradient>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto">
            <path d="M0 0 L8 3 L0 6 Z" fill="hsl(var(--brand-2))" />
          </marker>
        </defs>

        {/* Buyer node */}
        <rect
          x="20"
          y="70"
          width="100"
          height="60"
          rx="16"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        <text
          x="70"
          y="95"
          textAnchor="middle"
          className="fill-foreground"
          fontSize="11"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Buyer
        </text>
        <text x="70" y="113" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
          sends crypto
        </text>

        {/* Escrow node — centre */}
        <rect
          x="190"
          y="55"
          width="100"
          height="90"
          rx="20"
          fill="url(#flow-g)"
          className="drop-shadow-[0_4px_16px_hsl(var(--primary)/0.4)]"
        />
        <text x="240" y="93" textAnchor="middle" fontSize="12" fontWeight="700" fill="white">
          Escrow
        </text>
        <text x="240" y="112" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.8)">
          locked on-chain
        </text>
        {/* Lock icon simplified */}
        <rect x="224" y="118" width="32" height="20" rx="4" fill="rgba(255,255,255,0.2)" />
        <path
          d="M234 118 v-6 a6 6 0 0 1 12 0 v6"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth="2"
          fill="none"
        />

        {/* Seller node */}
        <rect
          x="360"
          y="70"
          width="100"
          height="60"
          rx="16"
          fill="hsl(var(--card))"
          stroke="hsl(var(--border))"
          strokeWidth="1.5"
        />
        <text
          x="410"
          y="95"
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="hsl(var(--foreground))"
        >
          Seller
        </text>
        <text x="410" y="113" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">
          receives payout
        </text>

        {/* Arrows */}
        <line
          x1="125"
          y1="100"
          x2="185"
          y2="100"
          stroke="hsl(var(--brand-1))"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />
        <line
          x1="295"
          y1="100"
          x2="355"
          y2="100"
          stroke="hsl(var(--brand-3))"
          strokeWidth="2"
          markerEnd="url(#arrow)"
        />

        {/* Animated dot on first path */}
        <circle r="5" fill="hsl(var(--brand-1))" opacity="0.9">
          <animateMotion dur="2.5s" repeatCount="indefinite" path="M125,100 L185,100" />
        </circle>
        {/* Animated dot on second path */}
        <circle r="5" fill="hsl(var(--brand-3))" opacity="0.9">
          <animateMotion
            dur="2.5s"
            begin="1.25s"
            repeatCount="indefinite"
            path="M295,100 L355,100"
          />
        </circle>

        {/* Label below arrows */}
        <text x="155" y="120" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
          funds held
        </text>
        <text x="325" y="120" textAnchor="middle" fontSize="8" fill="hsl(var(--muted-foreground))">
          on approval
        </text>
      </svg>
    </div>
  );
}
