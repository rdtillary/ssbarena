'use client';

import React from 'react';
import type { TranscriptToken } from '@/lib/types';

export interface LecturetteAttempt {
  id: string;
  topic_id: number | null;
  topic: string;
  category?: string | null;
  audio_url: string | null;
  duration_seconds: number;
  transcript: string | null;
  valid: boolean | null;
  word_count: number | null;
  wpm: number | null;
  filler_count: number | null;
  stammer_count: number | null;
  pause_count: number | null;
  longest_pause: number | null;
  tokens: TranscriptToken[] | null;
  created_at: string;
}

const Chip = ({ children, red }: { children: React.ReactNode; red?: boolean }) => (
  <span
    className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
      red ? 'bg-red-950/40 border-red-900/60 text-red-400' : 'bg-slate-950 border-slate-800 text-slate-300'
    }`}
  >
    {children}
  </span>
);

/** Transcript with fumbles (stammers, fillers, pauses) highlighted in red. */
export function LecturetteTranscript({ a }: { a: LecturetteAttempt }) {
  const tokens = Array.isArray(a.tokens) ? a.tokens : [];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {a.word_count !== null && <Chip>{a.word_count} words</Chip>}
        {a.wpm !== null && <Chip>{a.wpm} WPM</Chip>}
        {a.pause_count !== null && <Chip red>{a.pause_count} pauses</Chip>}
        {a.stammer_count !== null && <Chip red>{a.stammer_count} stammers</Chip>}
        {a.filler_count !== null && <Chip red>{a.filler_count} fillers</Chip>}
        {!!a.longest_pause && <Chip>longest pause {a.longest_pause}s</Chip>}
      </div>
      {a.audio_url && <audio controls preload="none" src={a.audio_url} className="w-full h-9" />}
      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
        <p className="text-xs font-bold text-slate-400">
          Transcript <span className="text-red-400 font-normal">(red = stammer / filler / pause)</span>
        </p>
        {tokens.length > 0 ? (
          <p className="text-sm text-slate-200 leading-loose">
            {tokens.map((t, i) =>
              t.type === 'pause' ? (
                <span key={i} className="mx-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[11px] font-bold">
                  ⏸ {t.text}
                </span>
              ) : t.type === 'word' ? (
                <span key={i}>{t.text} </span>
              ) : (
                <span key={i}>
                  <span className="px-0.5 rounded bg-red-500/20 text-red-400 font-bold underline decoration-red-500">
                    {t.text}
                  </span>{' '}
                </span>
              )
            )}
          </p>
        ) : (
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
            {a.transcript || (a.valid === false ? 'No speech detected.' : 'No transcript.')}
          </p>
        )}
      </div>
    </div>
  );
}
