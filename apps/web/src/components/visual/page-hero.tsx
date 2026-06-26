import { AuroraBackground } from '@/components/visual/aurora-background';

/** Standardized hero band for marketing/legal subpages. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden border-b">
      <AuroraBackground />
      <div className="container flex flex-col items-center gap-5 py-14 text-center sm:py-20 md:py-24">
        {eyebrow ? <span className="eyebrow animate-fade-in">{eyebrow}</span> : null}
        <h1 className="max-w-3xl text-balance break-words font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl md:leading-[1.08] animate-fade-up">
          {title}
        </h1>
        {subtitle ? (
          <p className="max-w-2xl text-base text-muted-foreground animate-fade-up animation-delay-200 sm:text-lg">
            {subtitle}
          </p>
        ) : null}
        {children ? <div className="animate-fade-up animation-delay-400">{children}</div> : null}
      </div>
    </section>
  );
}
