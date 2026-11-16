import React from 'react';
import { Award } from 'lucide-react';
import { RecommendedCandidate } from '@/lib/types';

export function RecommendedSlide({ candidates }: { candidates: RecommendedCandidate[] }) {
  return (
    <section className="h-full flex flex-col justify-center p-6 sm:p-8 pb-10 sm:pb-12 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
      <span className="inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold mb-3">
        <Award className="w-3.5 h-3.5" /> RECOMMENDED CANDIDATES
      </span>
      <h2 className="text-xl sm:text-3xl font-black text-white leading-tight">
        Aspirants recommended at their SSB
      </h2>

      {candidates.length === 0 ? (
        <p className="text-slate-400 text-sm mt-3">
          Recommended candidates will appear here soon.
        </p>
      ) : (
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {candidates.map((c) => (
            <div
              key={c.id}
              className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800"
            >
              <div className="aspect-square sm:aspect-[4/5] bg-slate-800">
                <img src={c.photo_url} alt={c.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-2.5">
                <p className="text-sm font-bold text-white truncate">{c.name}</p>
                <p className="text-[11px] text-amber-400 truncate">{c.ssb_name}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
