'use client';

import * as React from 'react';

/** Animated number that counts up when scrolled into view. */
export function CountUp({
  end,
  duration = 1800,
  prefix = '',
  suffix = '',
  decimals = 0,
}: {
  end: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [value, setValue] = React.useState(0);
  const started = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setValue(end);
      return;
    }

    const runAnimation = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(end * eased);
        if (progress < 1) requestAnimationFrame(tick);
        else setValue(end);
      };
      requestAnimationFrame(tick);
    };

    // Use threshold:0 so the animation starts as soon as any pixel enters the
    // viewport — this prevents the CSS translate on the parent Reveal wrapper
    // from delaying the trigger, and also handles elements already in view.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) runAnimation();
      },
      { threshold: 0, rootMargin: '0px 0px -80px 0px' },
    );

    observer.observe(el);

    // Fallback: if the element is already fully visible (no scroll needed),
    // IntersectionObserver may not fire on some builds — start after one frame.
    const raf = requestAnimationFrame(() => {
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) runAnimation();
      }
    });

    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
}
