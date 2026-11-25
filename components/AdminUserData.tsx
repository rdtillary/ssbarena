'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { AdminUsers } from '@/components/AdminUsers';
import { OlqAnalysis } from '@/components/OlqAnalysis';
import { RecommendationMeter } from '@/components/RecommendationMeter';

interface Item {
  id: string;
  source?: 'recording' | 'attempt';
  visitor_id: string;
  email: string;
  name: string;
  scenario_title: string;
  recommended_story?: string;
  story_olqs?: string[];
  audio_url: string | null;
  transcript: string | null;
  main_action: string;
  valid: boolean | null;
  story_score: number | null;
  narration_score: number | null;
  total_score: number | null;
  max_score: number;
  duration_seconds: number;
  result?: any;
  created_at: string;
}
interface Stats {
  totalVisits: number;
  uniqueVisitors: number;
  visitsToday: number;
  visits7d: number;
  recordings: number;
  recordingUsers: number;
  days: { date: string; visits: number }[];
}
interface Group {
  key: string;
  title: string;
  sub: string;
  list: Item[];
}

const shortId = (v: string) => `U-${v.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

const BREAKDOWN: Record<string, string> = {
  heroClarity: 'Hero clarity',
  pastPresentFuture: 'Past-Present-Future',
  practicalAction: 'Practical action',
  structurePacing: 'Structure & pacing',
  vocalFluency: 'Vocal fluency',
  timeControl: 'Time control',
};

function Chip({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'red' }) {
  return (
    <span
      className={`px-2.5 py-1 rounded border text-[11px] font-bold ${
        tone === 'red'
          ? 'bg-red-950/40 border-red-900/60 text-red-400'
          : 'bg-slate-900 border-slate-800 text-slate-300'
      }`}
    >
      {children}
    </span>
  );
}

// The same information the user sees on their own result page, for the admin.
function FullResult({ a, onUpdated }: { a: Item; onUpdated: (id: string, result: any) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const r = a.result || {};
  const breakdown: Record<string, number> | undefined = r.breakdown;
  const hasOlq = Boolean(r.olq?.scores);
  const tokens: any[] = Array.isArray(r.tokens) ? r.tokens : [];

  const generate = async () => {
    setBusy(true);
    setErr('');
    try {
      const res = await fetch('/api/admin/olq-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: a.id }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not generate.');
      onUpdated(a.id, d.result);
    } catch (e: any) {
      setErr(e.message || 'Could not generate.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      {r.recommendation && a.total_score !== null && (
        <RecommendationMeter totalScore={a.total_score} maxScore={a.max_score} recommendation={r.recommendation} />
      )}

      {hasOlq ? (
        <OlqAnalysis olq={r.olq} />
      ) : (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
          <p className="text-xs text-slate-400">No OLQ report saved for this attempt.</p>
          {a.source === 'recording' && a.transcript && a.transcript.length >= 20 && (
            <button
              onClick={generate}
              disabled={busy}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" /> {busy ? 'Generating...' : 'Generate 15-OLQ report now'}
            </button>
          )}
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>
      )}

      {r.summary && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-500 mb-1">Overall feedback</p>
          <p className="text-xs text-slate-300">{r.summary}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {a.story_score !== null && <Chip>Story {a.story_score}/40</Chip>}
        {a.narration_score !== null && <Chip>Narration {a.narration_score}/20</Chip>}
        {r.wordCount !== undefined && <Chip>{r.wordCount} words</Chip>}
        {r.wpm !== undefined && <Chip>{r.wpm} WPM</Chip>}
        {r.longestPause !== undefined && <Chip>longest pause {r.longestPause}s</Chip>}
        {r.pauseCount !== undefined && <Chip tone="red">{r.pauseCount} pauses</Chip>}
        {r.stammerCount !== undefined && <Chip tone="red">{r.stammerCount} stammers</Chip>}
        {r.fillerCount !== undefined && <Chip tone="red">{r.fillerCount} fillers</Chip>}
      </div>

      {breakdown && (
        <div className="grid sm:grid-cols-2 gap-2 text-xs">
          {Object.entries(BREAKDOWN).map(([k, label]) =>
            breakdown[k] !== undefined ? (
              <div key={k} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-slate-300">{label}</span>
                <span className="font-black text-amber-400">{breakdown[k]}/10</span>
              </div>
            ) : null
          )}
        </div>
      )}

      {Array.isArray(r.pins) && r.pins.length > 0 && (
        <p className="text-[11px] text-slate-400">
          <span className="text-slate-500">Characters marked:</span>{' '}
          {r.pins
            .map((p: any) => `${p.isHero ? '★ ' : ''}${p.sex}${p.age}(${p.mood})`)
            .join(', ')}
        </p>
      )}

      {tokens.length > 0 && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
          <p className="text-[10px] font-bold uppercase text-slate-500">
            Annotated transcript <span className="text-red-400 normal-case font-normal">(red = stammer / filler / pause)</span>
          </p>
          <p className="text-xs text-slate-200 leading-loose">
            {tokens.map((t, i) =>
              t.type === 'pause' ? (
                <span key={i} className="mx-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                  ⏸ {t.text}
                </span>
              ) : t.type === 'word' ? (
                <span key={i}>{t.text} </span>
              ) : (
                <span key={i}>
                  <span className="px-0.5 rounded bg-red-500/20 text-red-400 font-bold underline decoration-red-500">{t.text}</span>{' '}
                </span>
              )
            )}
          </p>
        </div>
      )}

      {(r.strengths?.length > 0 || r.improvements?.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-1">
            <p className="font-bold text-emerald-400">Strengths</p>
            {(r.strengths || []).map((s: string, i: number) => (
              <p key={i} className="text-slate-300">• {s}</p>
            ))}
          </div>
          <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 space-y-1">
            <p className="font-bold text-amber-400">Improvements</p>
            {(r.improvements || []).map((s: string, i: number) => (
              <p key={i} className="text-slate-300">• {s}</p>
            ))}
          </div>
        </div>
      )}

      {a.recommended_story && (
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-black text-amber-400">Recommended Candidate Response (model story)</p>
            <div className="flex flex-wrap gap-1.5">
              {(a.story_olqs || []).map((o) => (
                <span key={o} className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">{o}</span>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">{a.recommended_story}</p>
        </div>
      )}
    </div>
  );
}

function AttemptCard({ a, onUpdated }: { a: Item; onUpdated: (id: string, result: any) => void }) {
  const [full, setFull] = useState(false);
  return (
    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-white">{a.scenario_title || 'PPDT'}</p>
        {a.total_score !== null ? (
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-black">
            {a.total_score}/{a.max_score}
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-bold">Not graded</span>
        )}
      </div>
      <p className="text-[11px] text-slate-500">
        {new Date(a.created_at).toLocaleString()}
        {a.duration_seconds ? ` • ${a.duration_seconds}s` : ''}
        {a.story_score !== null && a.narration_score !== null
          ? ` • Story ${a.story_score}/40 • Narration ${a.narration_score}/20`
          : ''}
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
          {a.transcript || (a.valid === false ? 'No speech detected.' : 'No transcript.')}
        </p>
      </div>

      <button
        onClick={() => setFull(!full)}
        className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-black text-amber-400 flex items-center justify-center gap-1.5"
      >
        {full ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        {full ? 'Hide full result & OLQ report' : 'Show full result, OLQ report & assessment'}
      </button>
      {full && <FullResult a={a} onUpdated={onUpdated} />}
    </div>
  );
}

function GroupList({
  groups,
  open,
  setOpen,
  onUpdated,
}: {
  groups: Group[];
  open: string | null;
  setOpen: (k: string | null) => void;
  onUpdated: (id: string, result: any) => void;
}) {
  return (
    <div className="space-y-2.5">
      {groups.map((g) => {
        const isOpen = open === g.key;
        return (
          <div key={g.key} className="rounded-xl bg-slate-900 border border-slate-800">
            <button onClick={() => setOpen(isOpen ? null : g.key)} className="w-full p-3.5 flex items-center justify-between gap-3 text-left">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{g.title}</p>
                {g.sub && <p className="text-[11px] text-slate-400 truncate">{g.sub}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 text-xs font-black">
                  {g.list.length} recording{g.list.length === 1 ? '' : 's'}
                </span>
                {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-3.5 pb-3.5 space-y-3">
                {g.list.map((a) => (
                  <AttemptCard key={a.id} a={a} onUpdated={onUpdated} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function AdminUserData() {
  const [tab, setTab] = useState<'users' | 'recordings'>('users');
  const [stats, setStats] = useState<Stats | null>(null);
  const [recs, setRecs] = useState<Item[]>([]);
  const [legacy, setLegacy] = useState<Item[]>([]);
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
      setRecs(d.recordings || []);
      setLegacy(d.legacy || []);
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
      const res = await fetch(`/api/admin/user-data?offset=${recs.length}`, { cache: 'no-store' });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setRecs((a) => [...a, ...(d.recordings || [])]);
    } finally {
      setMore(false);
    }
  };

  const onUpdated = (id: string, result: any) =>
    setRecs((list) => list.map((r) => (r.id === id ? { ...r, result } : r)));

  const viewActivity = (email: string) => {
    setQ(email);
    setOpen(null);
    setTab('recordings');
  };

  const needle = q.trim().toLowerCase();

  const groups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of recs) {
      const g = map.get(r.visitor_id) || {
        key: r.visitor_id,
        title: `${shortId(r.visitor_id)}${r.email ? ' • ' + r.email : ' • Guest'}`,
        sub: `Full ID: ${r.visitor_id}${r.name ? ' • ' + r.name : ''}`,
        list: [],
      };
      if (r.email && !g.title.includes('@')) g.title = `${shortId(r.visitor_id)} • ${r.email}`;
      g.list.push(r);
      map.set(r.visitor_id, g);
    }
    return Array.from(map.values()).filter(
      (g) => !needle || g.title.toLowerCase().includes(needle) || g.sub.toLowerCase().includes(needle)
    );
  }, [recs, needle]);

  const legacyGroups = useMemo<Group[]>(() => {
    const map = new Map<string, Group>();
    for (const r of legacy) {
      const g = map.get(r.email) || { key: `old-${r.email}`, title: r.email, sub: r.name, list: [] };
      g.list.push(r);
      map.set(r.email, g);
    }
    return Array.from(map.values()).filter((g) => !needle || g.title.toLowerCase().includes(needle));
  }, [legacy, needle]);

  const maxDay = Math.max(1, ...(stats?.days.map((d) => d.visits) || [1]));
  const cards: [string, number, string][] = stats
    ? [
        ['Total visits', stats.totalVisits, 'text-white'],
        ['Unique visitors', stats.uniqueVisitors, 'text-sky-400'],
        ['Visits today', stats.visitsToday, 'text-amber-400'],
        ['Visits (7 days)', stats.visits7d, 'text-white'],
        ['PPDT recordings', stats.recordings, 'text-emerald-400'],
        ['Users who recorded', stats.recordingUsers, 'text-amber-400'],
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

      <div className="flex gap-2">
        {([
          ['users', 'All Users'],
          ['recordings', 'Recordings, Results & OLQ'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-black ${
              tab === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <AdminUsers onViewActivity={viewActivity} />}

      {tab === 'recordings' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white shrink-0">By user</h3>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ID or email..."
              className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
            />
            {q && (
              <button onClick={() => setQ('')} className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300">
                Clear
              </button>
            )}
          </div>

          {groups.length === 0 && legacyGroups.length === 0 && !loading && (
            <p className="text-xs text-slate-400">No recordings found.</p>
          )}
          <GroupList groups={groups} open={open} setOpen={setOpen} onUpdated={onUpdated} />

          {recs.length < total && (
            <button
              onClick={loadMore}
              disabled={more}
              className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-bold text-amber-400 disabled:opacity-50"
            >
              {more ? 'Loading...' : `Load more (${recs.length} of ${total})`}
            </button>
          )}

          {legacyGroups.length > 0 && (
            <div className="space-y-2.5 pt-2">
              <h3 className="text-sm font-black text-white">Earlier attempts (signed-in users, before anonymous IDs)</h3>
              <GroupList groups={legacyGroups} open={open} setOpen={setOpen} onUpdated={onUpdated} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
