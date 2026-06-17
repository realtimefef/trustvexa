import { BrandLogo } from '@/components/visual/brand-logo';

/** App-wide route loading fallback (Next.js loading.tsx). */
export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6">
      <div className="relative">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
        <BrandLogo showText={false} className="relative animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
      </div>
    </main>
  );
}
