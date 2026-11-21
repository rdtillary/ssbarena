'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Sparkles, RefreshCw } from 'lucide-react';
import { OLQS, OlqReport } from '@/lib/olq';
import { OlqRadar } from '@/components/OlqRadar';

function barColor(score: number) {
  if (score >= 75) return 'bg-emerald-500';
  if (score >= 55) return 'bg-amber-500';
  return 'bg-red-500';
}

export default function ReportPage() {
  const params = useParams<{ id: string }>();
  const [report, setReport] = useState<OlqReport | null>(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/olq-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attempt_id: params.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load the report.');
      setReport(data.report);
      setTitle(data.scenario_title || '');
    } catch (err: any) {
      setError(err.message || 'Could not load the report.');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  const average = report
    ? Math.round(OLQS.reduce((sum, q) => sum + (report.scores[q] ?? 0), 0) / OLQS.length)
    : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to SSB Arena
      </Link>

      {loading && (
        <div className="p-10 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-amber-400 mx-auto animate-pulse" />
          <p className="text-sm font-bold text-white">Our assessor is judging your narration...</p>
          <p className="text-xs text-slate-400">This takes about 10–20 seconds the first time.</p>
        </div>
      )}

      {!loading && error && (
        <div className="p-6 rounded-2xl bg-red-950/50 border border-red-800 text-center space-y-3">
          <p className="text-sm text-red-300">{error}</p>
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-white inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Try again
          </button>
        </div>
      )}

      {!loading && report && (
        <>
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-amber-400">AI OLQ Report</p>
                <h1 className="text-lg font-black text-white">{title || 'PPDT Narration'}</h1>
              </div>
              <div className="text-right shrink-0">
                <p className="text-3xl font-black text-amber-400">{average}</p>
                <p className="text-[10px] text-slate-400 uppercase font-bold">Average / 100</p>
              </div>
            </div>

            <OlqRadar scores={report.scores} />
          </div>

          {report.summary && (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-sm font-black text-white mb-1.5">Overall feedback</h2>
              <p className="text-sm text-slate-300">{report.summary}</p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-sm font-black text-emerald-400 mb-2">Strengths</h2>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {report.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <h2 className="text-sm font-black text-amber-400 mb-2">Work on</h2>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
                {report.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-2.5">
            <h2 className="text-base font-black text-white">Quality-wise scores</h2>
            {OLQS.map((q) => {
              const score = report.scores[q] ?? 0;
              return (
                <div key={q} className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-white">{q}</p>
                    <p className="text-sm font-black text-white">
                      {score}
                      <span className="text-slate-500 text-xs"> / 100</span>
                    </p>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div className={`h-full ${barColor(score)}`} style={{ width: `${score}%` }} />
                  </div>
                  {report.remarks[q] && <p className="text-xs text-slate-400">{report.remarks[q]}</p>}
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            AI-generated practice feedback based on your narration. It is not an official SSB assessment.
          </p>
        </>
      )}
    </div>
  );
}
