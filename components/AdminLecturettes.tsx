'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { LecturetteTranscript, type LecturetteAttempt } from '@/components/LecturetteTranscript';

type Row = LecturetteAttempt & { email: string; name: string };

export function AdminLecturettes() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; valid: number; users: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/lecturettes', { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not load lecturettes');
      setRows(d.attempts || []);
      setTotal(d.total || 0);
      setStats(d.stats || null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    setMore(true);
    try {
      const res = await fetch(`/api/admin/lecturettes?offset=${rows.length}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setRows((r) => [...r, ...(d.attempts || [])]);
    } finally {
      setMore(false);
    }
  };

  const needle = q.trim().toLowerCase();
  const shown = useMemo(
    () => rows.filter((r) => !needle || r.email.toLowerCase().includes(needle) || r.topic.toLowerCase().includes(needle)),
    [rows, needle]
  );

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">Lecturette Recordings</h2>
        <button onClick={load} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading && <p className="text-xs text-slate-400">Loading...</p>}

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Recordings', stats.total, 'text-white'],
            ['Valid (counted)', stats.valid, 'text-emerald-400'],
            ['Users', stats.users, 'text-amber-400'],
          ].map(([l, v, c]) => (
            <div key={String(l)} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">{l}</p>
              <p className={`text-2xl font-black ${c}`}>{v}</p>
            </div>
          ))}
        </div>
      )}

      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search email or topic..."
        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
      />

      {shown.length === 0 && !loading && <p className="text-xs text-slate-400">No lecturettes found.</p>}
      <div className="space-y-2.5">
        {shown.map((r) => {
          const isOpen = open === r.id;
          return (
            <div key={r.id} className="rounded-xl bg-slate-900 border border-slate-800">
              <button onClick={() => setOpen(isOpen ? null : r.id)} className="w-full p-3.5 flex items-center justify-between gap-3 text-left">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.topic}</p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {r.email}
                    {r.name ? ` • ${r.name}` : ''} • {new Date(r.created_at).toLocaleString()} • {r.duration_seconds}s
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!r.valid && <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold">INVALID</span>}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5">
                  <LecturetteTranscript a={r} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {rows.length < total && (
        <button onClick={loadMore} disabled={more} className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 disabled:opacity-50">
          {more ? 'Loading...' : `Load more (${rows.length} of ${total})`}
        </button>
      )}
    </section>
  );
}
