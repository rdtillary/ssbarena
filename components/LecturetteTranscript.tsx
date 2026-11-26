'use client';

import React from 'react';
import type { TranscriptToken } from '@/lib/types';
import { CRITERIA, type LecturetteAssessment } from '@/lib/lecturette-assessment';

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
  assessment?: LecturetteAssessment | null;
  total_score?: number | null;
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

const barColor = (n: number) => (n >= 7 ? 'bg-emerald-500' : n >= 5 ? 'bg-amber-500' : 'bg-red-500');

/** The five GTO criteria, each /10, with one specific line of feedback. */
export function LecturetteAssessmentCard({ a }: { a: LecturetteAssessment }) {
  return (
    <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase text-amber-400">Assessment</p>
          <p className="text-xs text-slate-400">Five things a GTO judges in a lecturette</p>
        </div>
        <p className="text-3xl font-black text-white leading-none">
          {a.total}
          <span className="text-sm text-slate-500 font-bold">/50</span>
        </p>
      </div>
      <div className="space-y-3.5">
        {CRITERIA.map((c) => (
          <div key={c.key} className="space-y-1">
            <div className="flex justify-between text-xs font-bold">
              <span className="text-slate-200">{c.label}</span>
              <span className="text-slate-300">{a.scores[c.key]}/10</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div className={`h-full ${barColor(a.scores[c.key])}`} style={{ width: `${a.scores[c.key] * 10}%` }} />
            </div>
            {a.feedback[c.key] && <p className="text-[12px] text-slate-400 leading-snug">{a.feedback[c.key]}</p>}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {a.voiceSteadiness !== null && <Chip>Voice steadiness {a.voiceSteadiness}/100</Chip>}
        {a.secondsAfterBell !== null && (
          <Chip>{a.secondsAfterBell > 0 ? `Spoke ${a.secondsAfterBell}s after the bell` : 'Finished by the bell'}</Chip>
        )}
      </div>
      {a.strengths.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase text-emerald-400 mb-1">Strengths</p>
          <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">{a.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      {a.improvements.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase text-red-400 mb-1">To improve</p>
          <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">{a.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul>
        </div>
      )}
      <p className="text-[10px] text-slate-500">Practice feedback from your transcript, timing and voice. Not an official SSB assessment.</p>
    </div>
  );
}

/** Transcript with fumbles (stammers, fillers, pauses) highlighted in red. */
export function LecturetteTranscript({ a }: { a: LecturetteAttempt }) {
  const tokens = Array.isArray(a.tokens) ? a.tokens : [];
  return (
    <div className="space-y-3">
      {a.assessment && <LecturetteAssessmentCard a={a.assessment} />}
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
