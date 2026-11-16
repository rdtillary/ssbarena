'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  slides: React.ReactNode[];
  intervalMs?: number;
}

export function Carousel({ slides, intervalMs = 6000 }: Props) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  // Restarts after every slide change (manual or automatic), so a manual click never gets skipped immediately.
  useEffect(() => {
    if (paused || count < 2) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearTimeout(t);
  }, [index, paused, count, intervalMs]);

  const go = (i: number) => setIndex(((i % count) + count) % count);

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription="carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        if (touchX.current !== null) {
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? index + 1 : index - 1);
        }
        touchX.current = null;
        setPaused(false);
      }}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="w-full shrink-0 grow-0 basis-full" aria-hidden={i !== index}>
              {slide}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-slate-950/70 border border-slate-700 text-slate-200 hover:bg-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 items-center justify-center rounded-full bg-slate-950/70 border border-slate-700 text-slate-200 hover:bg-slate-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="absolute bottom-3 inset-x-0 flex items-center justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? 'w-5 bg-amber-400' : 'w-1.5 bg-slate-600 hover:bg-slate-500'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
