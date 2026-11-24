'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface Attempt {
  id: string;
  user_id: string;
  email: string;
  name: string;
  scenario_title: string;
  story_score: number;
  narration_score: number;
  total_score: number;
  max_score: number;
  transcript: string | null;
  audio_url: string | null;
  main_action: string;
  created_at: string;
}
interface Stats {
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  visits7d: number;
  uniqueVisitors7d: number;
  ppdtAttempts: number;
  practisingUsers: number;
  days: { date: string; visits: number }[];
}

export function AdminUserData() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/user-data', { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not load data');
      setStats(d.stats);
      setAttempts(d.attempts || []);
      setTotal(d.total || 0);
    } catch (e: any) {
      setError(e.message || 'Could not load data');
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
      const res = await fetch(`/api/admin/user-data?offset=${attempts.length}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setAttempts((a) => [...a, ...(d.attempts || [])]);
    } finally {
      setMore(false);
    }
  };

  const users = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const map = new Map<string, { id: string; email: string; name: string; list: Attempt[] }>();
    for (const a of attempts) {
      const u = map.get(a.user_id) || { id: a.user_id, email: a.email, name: a.name, list: [] };
      u.list.push(a);
      map.set(a.user_id, u);
    }
    return Array.from(map.values()).filter(
      (u) => !needle || u.email.toLowerCase().includes(needle) || u.name.toLowerCase().includes(needle)
    );
  }, [attempts, q]);

  const maxDay = Math.max(1, ...(stats?.days.map((d) => d.visits) || [1]));
  const cards: [string, number, string][] = stats
    ? [
        ['Total visits', stats.totalVisits, 'text-white'],
        ['Unique visitors', stats.uniqueVisitors, 'text-sky-400'],
        ['Visits today', stats.visitsToday, 'text-amber-400'],
        ['Visits (7 days)', stats.visits7d, 'text-white'],
        ['PPDT attempts', stats.ppdtAttempts, 'text-emerald-400'],
        ['Users who practised', stats.practisingUsers, 'text-amber-400'],
      ]
    : [];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">User Data</h2>
        <button onClick={load} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading && <p className="text-xs text-slate-400">Loading...</p>}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {cards.map(([l, v, c]) => (
              <div key={l} className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                <p className="text-[10px] font-bold uppercase text-slate-400">{l}</p>
                <p className={`text-2xl font-black ${c}`}>{v}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-500">
            A visit = one browser session on the site (admin pages and bots are not counted). Tracking started when this update went live.
          </p>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
            <p className="text-xs font-bold text-white mb-3">Visits, last 14 days</p>
            <div className="flex items-end gap-1.5 h-24">
              {stats.days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${d.date}: ${d.visits}`}>
                  <span className="text-[9px] text-slate-400">{d.visits || ''}</span>
                  <div className="w-full rounded-t bg-amber-500" style={{ height: `${(d.visits / maxDay) * 80}%`, minHeight: d.visits ? 3 : 1 }} />
                </div>
              ))}
            </div>
            <div className="flex gap-1.5 mt-1">
              {stats.days.map((d) => (
                <span key={d.date} className="flex-1 text-center text-[8px] text-slate-500">{d.date.slice(8)}</span>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <h3 className="text-sm font-black text-white shrink-0">PPDT attempts by user</h3>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email or name..."
          className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
        />
      </div>

      <div className="space-y-2.5">
        {users.length === 0 && !loading && <p className="text-xs text-slate-400">No attempts found.</p>}
        {users.map((u) => {
          const isOpen = open === u.id;
          return (
            <div key={u.id} className="rounded-xl bg-slate-900 border border-slate-800">
              <button
                onClick={() => setOpen(isOpen ? null : u.id)}
                className="w-full p-3.5 flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.email}</p>
                  {u.name && <p className="text-[11px] text-slate-400 truncate">{u.name}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-xs font-black">
                    {u.list.length} attempt{u.list.length === 1 ? '' : 's'}
                  </span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-3.5 pb-3.5 space-y-3">
                  {u.list.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-bold text-white">{a.scenario_title}</p>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-black">
                          {a.total_score}/{a.max_score}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(a.created_at).toLocaleString()} • Story {a.story_score}/40 • Narration {a.narration_score}/20
                      </p>
                      {a.main_action && (
                        <p className="text-[11px] text-slate-400">
                          <span className="text-slate-500">Main action:</span> {a.main_action}
                        </p>
                      )}
                      {a.audio_url ? (
                        <audio controls preload="none" src={a.audio_url} className="w-full h-9" />
                      ) : (
                        <p className="text-[11px] text-slate-500">No audio saved.</p>
                      )}
                      <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                        <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Transcript</p>
                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {a.transcript || 'No transcript.'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {attempts.length < total && (
        <button
          onClick={loadMore}
          disabled={more}
          className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 disabled:opacity-50"
        >
          {more ? 'Loading...' : `Load more (${attempts.length} of ${total})`}
        </button>
      )}
    </section>
  );
}
