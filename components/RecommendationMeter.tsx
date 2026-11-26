'use client';

import React from 'react';
import type { Recommendation } from '@/lib/types';

interface Props {
  totalScore: number;
  maxScore?: number;
  recommendation: Recommendation;
}

const SEGMENTS = [
  { label: 'Very Low', color: 'bg-red-600' },
  { label: 'Low', color: 'bg-orange-500' },
  { label: 'Moderate', color: 'bg-amber-400' },
  { label: 'High', color: 'bg-lime-500' },
  { label: 'Very High', color: 'bg-emerald-500' },
];

const LEVEL_TEXT: Record<string, string> = {
  'Very Low': 'text-red-400',
  Low: 'text-orange-400',
  Moderate: 'text-amber-300',
  High: 'text-lime-400',
  'Very High': 'text-emerald-400',
};

/** Total score on top + a low -> very high meter for the chance of being recommended. */
export function RecommendationMeter({ totalScore, maxScore = 60, recommendation }: Props) {
  const p = Math.max(0, Math.min(100, recommendation.probability));

  return (
    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-amber-400">Your Total Score</p>
          <p className="text-3xl font-black text-white">
            {totalScore}
            <span className="text-lg text-slate-500"> / {maxScore}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase text-slate-400">Chance of recommendation</p>
          <p className={`text-xl font-black ${LEVEL_TEXT[recommendation.level] || 'text-white'}`}>
            {recommendation.level}
          </p>
          <p className="text-xs font-bold text-slate-300">~{p}%</p>
        </div>
      </div>

      <div className="pt-4">
        <div className="relative">
          <div className="flex gap-1">
            {SEGMENTS.map((seg) => (
              <div
                key={seg.label}
                className={`h-3 flex-1 first:rounded-l-full last:rounded-r-full ${seg.color} ${
                  seg.label === recommendation.level ? 'opacity-100' : 'opacity-40'
                }`}
              />
            ))}
          </div>
          <div
            className="absolute -top-3.5 -translate-x-1/2 transition-all"
            style={{ left: `${p}%` }}
            aria-hidden
          >
            <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[10px] border-l-transparent border-r-transparent border-t-white" />
          </div>
        </div>
        <div className="flex mt-1.5">
          {SEGMENTS.map((seg) => (
            <p key={seg.label} className="flex-1 text-center text-[9px] font-bold text-slate-400">
              {seg.label}
            </p>
          ))}
        </div>
      </div>

      {recommendation.reason && <p className="text-xs text-slate-300">{recommendation.reason}</p>}

      <p className="text-[11px] text-slate-500">
        An estimate for practice only. It is not a prediction of your real SSB result.
      </p>
    </div>
  );
}
