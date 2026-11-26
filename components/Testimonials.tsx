'use client';

import React, { useEffect, useState } from 'react';
import { X, BadgeCheck, Quote } from 'lucide-react';

const REVIEWS = [
  {
    name: 'Rahul Singh',
    tag: 'Best spend',
    quote: 'Sir this was my best spend recently, so much value I got. I am seeing improvement.',
    proof: '/reviews/rahul.jpg',
    hue: 'from-amber-300 to-amber-600',
  },
  {
    name: 'Sumit Gaur',
    tag: '23 PPDT stories done',
    quote:
      'I have already completed 23 PPDT stories and I see a clear difference in my writing and narration. I am a fresher and I feel confident that I would get screened in.',
    proof: '/reviews/sumit.jpg',
    hue: 'from-sky-300 to-sky-600',
  },
  {
    name: 'Reena Mishra',
    tag: 'Fewer filler words',
    quote:
      'I am using SSB Arena for a week. It’s so good, especially the automatic speech recognition. I have reduced the filler words and gaps in my narration. It was worth it.',
    proof: '/reviews/reena.jpg',
    hue: 'from-emerald-300 to-emerald-600',
  },
];

const initials = (n: string) =>
  n
    .split(' ')
    .map((p) => p[0])
    .join('');

export function Testimonials() {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section aria-label="What aspirants say" className="space-y-4">
      <div className="text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black tracking-[0.2em]">
          WHAT ASPIRANTS SAY
        </span>
        <h2 className="mt-2.5 text-xl sm:text-2xl font-black text-white">Real messages from real aspirants</h2>
      </div>

      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:overflow-visible">
        {REVIEWS.map((r) => (
          <article key={r.name} className="review-card snap-center shrink-0 w-[84%] sm:w-auto flex flex-col">
            <Quote aria-hidden className="absolute top-4 right-4 w-10 h-10 text-amber-400/10 rotate-180" />
            <span className="self-start px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-black tracking-wider uppercase">
              {r.tag}
            </span>
            <p className="mt-4 text-[15px] leading-relaxed text-slate-100 font-medium flex-1">“{r.quote}”</p>

            <button
              type="button"
              onClick={() => setOpen(r.proof)}
              className="mt-5 group relative overflow-hidden rounded-xl border border-slate-700/70 text-left"
              aria-label={`View ${r.name}'s original message`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.proof} alt={`Message from ${r.name}`} loading="lazy" className="w-full h-24 object-cover object-top opacity-80 group-hover:opacity-100 transition" />
              <span className="absolute inset-x-0 bottom-0 px-3 py-1.5 bg-gradient-to-t from-slate-950/95 to-transparent text-[10px] font-bold text-amber-300 tracking-wide">
                TAP TO VIEW ORIGINAL MESSAGE
              </span>
            </button>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${r.hue} text-slate-950 font-black text-sm flex items-center justify-center ring-2 ring-white/10`}>
                {initials(r.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-white leading-tight">{r.name}</p>
                <p className="text-[11px] text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <BadgeCheck className="w-3.5 h-3.5" /> SSB Arena user
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      {open && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(null)} className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 border border-slate-700 text-white">
            <X className="w-5 h-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={open} alt="Original message" onClick={(e) => e.stopPropagation()} className="max-w-full max-h-[85vh] rounded-2xl border border-slate-700 shadow-2xl" />
        </div>
      )}
    </section>
  );
}
