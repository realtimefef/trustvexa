import { Check } from 'lucide-react';

import { Reveal } from '@/components/visual/reveal';
import { cn } from '@/lib/utils';

/**
 * Reusable two-column "text + visual" content section. The visual is provided
 * by the caller (an SVG, illustration, or component); points render as a
 * checked list. Alternating layout via `reverse`.
 */
export function FeatureSplit({
  eyebrow,
  title,
  body,
  points = [],
  visual,
  reverse = false,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  points?: ReadonlyArray<string>;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2">
      <Reveal className={cn(reverse ? 'lg:order-2' : 'lg:order-1')}>
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
        {body ? <p className="mt-4 max-w-xl text-muted-foreground">{body}</p> : null}
        {points.length > 0 ? (
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
        ) : null}
      </Reveal>
      <Reveal
        delay={120}
        className={cn('flex justify-center', reverse ? 'lg:order-1' : 'lg:order-2')}
      >
        {visual}
      </Reveal>
    </div>
  );
}
