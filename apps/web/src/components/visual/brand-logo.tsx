import { cn } from '@/lib/utils';

/** Animated TrustVexa shield mark + wordmark, built as inline SVG. */
export function BrandLogo({
  className,
  showText = true,
  textClassName,
}: {
  className?: string;
  showText?: boolean;
  textClassName?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="relative inline-flex">
        <svg
          width="30"
          height="30"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
          className="drop-shadow-[0_2px_8px_hsl(var(--primary)/0.35)]"
        >
          <defs>
            <linearGradient
              id="tv-logo"
              x1="0"
              y1="0"
              x2="32"
              y2="32"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="hsl(var(--brand-1))" />
              <stop offset="0.5" stopColor="hsl(var(--brand-2))" />
              <stop offset="1" stopColor="hsl(var(--brand-3))" />
            </linearGradient>
          </defs>
          <path
            d="M16 1.5l11 4v8.2c0 7.1-4.6 12.9-11 16.8-6.4-3.9-11-9.7-11-16.8V5.5l11-4z"
            fill="url(#tv-logo)"
          />
          <path
            d="M10.5 16.2l3.8 3.8 7.2-7.6"
            stroke="white"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showText ? (
        <span className={cn('font-display text-lg font-bold tracking-tight', textClassName)}>
          Trust<span className="text-gradient">Vexa</span>
        </span>
      ) : null}
    </span>
  );
}
