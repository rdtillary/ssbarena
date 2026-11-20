'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PPDT_SCENARIOS } from '@/lib/seed-data';
import { PPDTScenario, UserAttempt } from '@/lib/types';

const BREAKDOWN_LABELS: Record<string, [string, number]> = {
  heroClarity: ['Hero clarity', 10],
  pastPresentFuture: ['Past-Present-Future', 10],
  practicalAction: ['Practical action', 10],
  structurePacing: ['Structure & pacing', 10],
  vocalFluency: ['Vocal fluency', 10],
  timeControl: ['Time control', 10],
};

export default function PPDTResultsPage() {
  const params = useParams();
  const supabase = createClient();
  const scenarioId = Number(params.id || 1);

  const [scenario, setScenario] = useState<PPDTScenario>(
    DEFAULT_PPDT_SCENARIOS.find((s) => s.id === scenarioId) || DEFAULT_PPDT_SCENARIOS[0]
  );
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sc } = await supabase
        .from('ppdt_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .maybeSingle();
      if (sc) setScenario(sc);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (user) {
        const { data } = await supabase
          .from('user_attempts')
          .select('*')
          .eq('user_id', user.id)
          .eq('attempt_type', 'PPDT')
          .eq('scenario_id', scenarioId)
          .order('created_at', { ascending: false });
        setAttempts((data as UserAttempt[]) || []);
      } else {
        try {
          const vault: UserAttempt[] = JSON.parse(localStorage.getItem('ssb_arena_guest_vault') || '[]');
          setAttempts(vault.filter((a) => a.attempt_type === 'PPDT' && a.scenario_id === scenarioId));
        } catch {
          setAttempts([]);
        }
      }
      setLoading(false);
    })();
  }, [scenarioId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading results...</div>;
  }

  const att = attempts[selected];

  if (!att) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-sm font-bold text-white">No saved result for this picture yet.</p>
        <Link
          href={`/ppdt/${scenarioId}`}
          className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black"
        >
          Start PPDT
        </Link>
      </div>
    );
  }

  const breakdown: Record<string, number> | undefined = att.payload?.breakdown;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
        <span className="text-xs font-bold text-slate-200 truncate">{scenario.title}</span>
        <Link
          href={`/ppdt/${scenarioId}`}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Retry
        </Link>
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-black text-white">
            Total Score: {att.total_score} / {att.max_score}
          </h2>
          <div className="flex gap-2 text-xs font-bold">
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
              Story: {att.story_score}/40
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">
              Narration: {att.narration_score}/20
            </span>
          </div>
        </div>

        <p className="text-[11px] text-slate-500">
          Attempted on {new Date(att.created_at).toLocaleString()}
        </p>

        {(att.payload?.stammerCount !== undefined) && (
          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
              {att.payload.pauseCount ?? 0} pauses
            </span>
            <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
              {att.payload.stammerCount ?? 0} stammers
            </span>
            <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
              {att.payload.fillerCount ?? 0} fillers
            </span>
          </div>
        )}

        {breakdown && (
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(BREAKDOWN_LABELS).map(([key, [label, max]]) =>
              breakdown[key] !== undefined ? (
                <div
                  key={key}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800"
                >
                  <span className="text-slate-300">{label}</span>
                  <span className="font-black text-amber-400">
                    {breakdown[key]}/{max}
                  </span>
                </div>
              ) : null
            )}
          </div>
        )}

        {att.audio_url && <audio controls src={att.audio_url} className="w-full h-9" />}

        {att.transcript && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <p className="text-xs font-bold text-slate-400">Your narration transcript</p>
            <p className="text-sm text-slate-200 leading-relaxed">{att.transcript}</p>
          </div>
        )}
      </div>

      {attempts.length > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <p className="text-xs font-bold text-white">All attempts ({attempts.length})</p>
          {attempts.map((a, i) => (
            <button
              key={a.id || i}
              type="button"
              onClick={() => setSelected(i)}
              className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                i === selected
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-300'
              }`}
            >
              <span>{new Date(a.created_at).toLocaleString()}</span>
              <span className="font-black text-emerald-400">
                {a.total_score}/{a.max_score}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-base font-black text-amber-400">Recommended Candidate Response</h3>
          <div className="flex flex-wrap gap-1.5">
            {scenario.olq_highlights?.map((olq, i) => (
              <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                {olq}
              </span>
            ))}
          </div>
        </div>
        <p className="text-sm text-slate-200 leading-relaxed">{scenario.recommended_story}</p>
        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4" /> Result saved
        </p>
      </div>
    </div>
  );
}
