'use client';

import React from 'react';
import { OLQS } from '@/lib/olq';
import { OlqRadar } from '@/components/OlqRadar';

interface Props {
  olq: { scores: Record<string, number>; remarks?: Record<string, string> };
}

function barColor(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 55) return 'bg-amber-500';
  return 'bg-red-500';
}

/** Spider graph + score out of 100 for each of the 15 Officer Like Qualities. */
export function OlqAnalysis({ olq }: Props) {
  const average = Math.round(
    OLQS.reduce((sum, q) => sum + (olq.scores[q] ?? 0), 0) / OLQS.length
  );

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-amber-400">AI OLQ Analysis</p>
          <h2 className="text-base font-black text-white">15 Officer Like Qualities</h2>
        </div>
        <div className="text-right shrink-0">
          <p className="text-3xl font-black text-amber-400">{average}</p>
          <p className="text-[10px] text-slate-400 uppercase font-bold">Average / 100</p>
        </div>
      </div>

      <OlqRadar scores={olq.scores} />

      <div className="space-y-2">
        {OLQS.map((q) => {
          const score = olq.scores[q] ?? 0;
          const remark = olq.remarks?.[q];
          return (
            <div key={q} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-white">{q}</p>
                <p className="text-xs font-black text-white">
                  {score}
                  <span className="text-slate-500"> / 100</span>
                </p>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className={`h-full ${barColor(score)}`} style={{ width: `${score}%` }} />
              </div>
              {remark && <p className="text-[11px] text-slate-400">{remark}</p>}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 text-center">
        AI-generated practice feedback based on your narration. Not an official SSB assessment.
      </p>
    </div>
  );
}
