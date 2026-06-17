'use client';

import * as React from 'react';
import { Star } from 'lucide-react';

interface ReviewStarsProps {
  rating: number;
  max?: number;
  className?: string;
  onRatingChange?: (rating: number) => void;
}

export function ReviewStars({ rating, max = 5, className, onRatingChange }: ReviewStarsProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {Array.from({ length: max }).map((_, idx) => {
        const starIndex = idx + 1;
        const isFilled = starIndex <= rating;
        return (
          <button
            key={idx}
            type="button"
            disabled={!onRatingChange}
            onClick={() => onRatingChange?.(starIndex)}
            className={`transition-colors focus:outline-none ${
              onRatingChange ? 'cursor-pointer hover:scale-110 active:scale-95' : 'cursor-default'
            }`}
          >
            <Star
              className={`h-4 w-4 ${
                isFilled
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground/35 fill-transparent'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
    </div>
  );
}
