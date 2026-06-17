'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Interactive 3D tilt card. Tracks pointer position and applies a subtle
 * perspective rotation plus a glare highlight. Respects reduced-motion.
 */
export function TiltCard({
  children,
  className,
  intensity = 10,
}: {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});
  const [glare, setGlare] = React.useState({ x: 50, y: 50, o: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * intensity * 2;
    const rotateX = (0.5 - py) * intensity * 2;
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`,
    });
    setGlare({ x: px * 100, y: py * 100, o: 0.18 });
  };

  const reset = () => {
    setStyle({ transform: 'perspective(1000px) rotateX(0) rotateY(0) scale(1)' });
    setGlare((g) => ({ ...g, o: 0 }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      style={style}
      className={cn(
        'relative transition-transform duration-200 ease-out will-change-transform motion-reduce:transform-none',
        className,
      )}
    >
      {children}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-200"
        style={{
          opacity: glare.o,
          background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, rgba(255,255,255,0.9), transparent 45%)`,
        }}
      />
    </div>
  );
}
