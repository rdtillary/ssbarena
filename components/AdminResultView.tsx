'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { OlqAnalysis } from '@/components/OlqAnalysis';
import { RecommendationMeter } from '@/components/RecommendationMeter';

const BREAKDOWN: Record<string, string> = {
  heroClarity: 'Hero clarity',
  pastPresentFuture: 'Past-Present-Future',
  practicalAction: 'Practical action',
  structurePacing: 'Structure & pacing',
  vocalFluency: 'Vocal fluency',
  timeControl: 'Time control',
};

/** The same result page the aspirant sees, for the admin. `item` comes from /api/admin/user-detail. */
export function ResultView({ item }: { item: any }) {
  const r = item.result || {};
  const [olq, setOlq] = useState<any>(r.olq || null);
  const [gen, setGen] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const transcript: string = item.transcript || r.transcript || '';
  const total = item.total_score ?? r.totalScore;
  const max = item.max_score || 60;
  const story = item.story_score ?? r.storyScore;
  const narr = item.narration_score ?? r.narrationScore;
  const strengths: string[] = r.strengths?.length ? r.strengths : gen?.strengths || [];
  const improvements: string[] = r.improvements?.length ? r.improvements : gen?.improvements || [];
  const summary: string = r.summary || gen?.summary || '';
  const pins: any[] = Array.isArray(r.pins) ? r.pins : [];

  const generate = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/olq-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: item.source, id: item.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Failed');
      setGen(d.report);
      setOlq({ scores: d.report.scores, remarks: d.report.remarks });
    } catch (e: any) {
      setErr(e.message || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-black text-white">
            Total Score: {total ?? '—'} / {max}
          </h3>
          {story != null && narr != null && (
            <div className="flex gap-2 text-xs font-bold">
              <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">Story: {story}/40</span>
              <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">Narration: {narr}/20</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-bold">
          {r.wordCount != null && <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">{r.wordCount} words</span>}
          {r.wpm != null && <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">{r.wpm} WPM</span>}
          {r.pauseCount != null && <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">{r.pauseCount} pauses</span>}
          {r.stammerCount != null && <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">{r.stammerCount} stammers</span>}
          {r.fillerCount != null && <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">{r.fillerCount} fillers</span>}
          {r.longestPause != null && r.longestPause > 0 && (
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">longest pause {r.longestPause}s</span>
          )}
          {item.duration_seconds ? (
            <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">{item.duration_seconds}s narration</span>
          ) : null}
        </div>

        {r.breakdown && (
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(BREAKDOWN).map(([k, label]) =>
              r.breakdown[k] !== undefined ? (
                <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-black text-amber-400">{r.breakdown[k]}/10</span>
                </div>
              ) : null
            )}
          </div>
        )}

        {(item.main_action || pins.length > 0) && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-1">
            {item.main_action && (
              <p><span className="text-slate-500">Main action written:</span> {item.main_action}</p>
            )}
            {pins.length > 0 && (
              <p>
                <span className="text-slate-500">Characters marked:</span>{' '}
                {pins.map((p: any) => `${p.sex}${p.age}(${p.mood})${p.isHero ? ' ★hero' : ''}`).join(', ')}
              </p>
            )}
          </div>
        )}

        {item.audio_url && <audio controls preload="none" src={item.audio_url} className="w-full h-9" />}

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <p className="text-xs font-bold text-slate-400">
            Transcript {Array.isArray(r.tokens) && r.tokens.length > 0 && <span className="text-red-400 font-normal">(red = stammer / filler / pause)</span>}
          </p>
          {Array.isArray(r.tokens) && r.tokens.length > 0 ? (
            <p className="text-sm text-slate-200 leading-loose">
              {r.tokens.map((t: any, i: number) =>
                t.type === 'pause' ? (
                  <span key={i} className="mx-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[11px] font-bold">⏸ {t.text}</span>
                ) : t.type === 'word' ? (
                  <span key={i}>{t.text} </span>
                ) : (
                  <span key={i}>
                    <span className="px-0.5 rounded bg-red-500/20 text-red-400 font-bold underline decoration-red-500">{t.text}</span>{' '}
                  </span>
                )
              )}
            </p>
          ) : (
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {transcript || (item.valid === false ? 'No speech detected.' : 'No transcript.')}
            </p>
          )}
        </div>

        {(strengths.length > 0 || improvements.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-1">
              <p className="font-bold text-emerald-400">Strengths</p>
              {strengths.map((s, i) => <p key={i} className="text-slate-300">• {s}</p>)}
            </div>
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1">
              <p className="font-bold text-amber-400">Improvements</p>
              {improvements.map((s, i) => <p key={i} className="text-slate-300">• {s}</p>)}
            </div>
          </div>
        )}
        {summary && <p className="text-xs text-slate-300"><span className="font-bold text-white">Overall feedback:</span> {summary}</p>}
      </div>

      {r.recommendation && (
        <RecommendationMeter totalScore={total ?? 0} maxScore={max} recommendation={r.recommendation} />
      )}

      {olq ? (
        <OlqAnalysis olq={olq} />
      ) : transcript.trim().length >= 20 ? (
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/30 text-center space-y-2">
          <p className="text-xs text-slate-400">This older attempt was saved without a 15-OLQ analysis.</p>
          <button
            onClick={generate}
            disabled={busy}
            className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" /> {busy ? 'Generating…' : 'Generate 15-OLQ report'}
          </button>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      ) : null}
    </div>
  );
}
