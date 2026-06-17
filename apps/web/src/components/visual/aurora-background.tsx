import { cn } from '@/lib/utils';

/**
 * Decorative animated aurora/blob background. Purely visual (aria-hidden).
 * Renders soft animated gradient blobs plus an optional grid overlay.
 */
export function AuroraBackground({
  className,
  grid = true,
}: {
  className?: string;
  grid?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
    >
      {grid ? (
        <div className="absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] opacity-60" />
      ) : null}
      <div className="absolute -top-32 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-brand-gradient opacity-20 blur-[120px] animate-aurora dark:opacity-25" />
      <div className="absolute right-[-10%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-accent/30 opacity-30 blur-[120px] animate-float-slow" />
      <div className="absolute bottom-[-10%] left-[-5%] h-[26rem] w-[26rem] rounded-full bg-primary/30 opacity-25 blur-[120px] animate-float-slow animation-delay-400" />
    </div>
  );
}
