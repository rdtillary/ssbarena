'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame, LogOut, Sparkles, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { isPhoneLogin } from '@/lib/login-id';
import { CRITERIA } from '@/lib/lecturette-assessment';
import { dayKey, streaks, MILESTONES } from '@/lib/streak';
import { ProCheckoutModal } from '@/components/ProCheckoutModal';
import { Logo } from '@/components/Logo';

type Test = {
  id: string;
  type: string;
  title: string;
  date: string;
  score: string;
  audio?: string | null;
  transcript?: string | null;
  scenarioId?: number;
  payload?: any;
  assessment?: any;
};

const card = 'p-4 rounded-2xl bg-slate-900 border border-slate-800';

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export default function ProfilePage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [days, setDays] = useState<string[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<'streak' | 'tests'>('streak');
  const [filter, setFilter] = useState('All');
  const [monthOffset, setMonthOffset] = useState(0);
  const [proOpen, setProOpen] = useState(false);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user || null;
    setUser(u);
    if (!u) return setLoading(false);

    await supabase.rpc('record_activity'); // so today shows on the calendar
    const [p, a, l, d] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).maybeSingle(),
      supabase.from('user_attempts').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('lecturette_attempts').select('*').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('user_activity_days').select('day').eq('user_id', u.id).order('day', { ascending: false }),
    ]);
    setProfile(p.data);
    setFailed(Boolean(a.error || l.error));

    const unit: Record<string, string> = { WAT: ' words', SRT: ' answered' };
    const list: Test[] = [
      ...(a.data || []).map((r: any) => ({
        id: String(r.id),
        type: r.attempt_type,
        title: r.scenario_title,
        date: r.created_at,
        score: `${r.total_score} / ${r.max_score}${unit[r.attempt_type] || ''}`,
        audio: r.audio_url,
        transcript: r.transcript,
        scenarioId: r.scenario_id,
        payload: r.payload,
      })),
      ...(l.data || []).map((r: any) => ({
        id: `l-${r.id}`,
        type: 'Lecturette',
        title: r.topic,
        date: r.created_at,
        score: r.total_score != null ? `${r.total_score} / 50` : r.valid ? 'Recorded' : 'No speech',
        audio: r.audio_url,
        transcript: r.transcript,
        assessment: r.assessment,
      })),
    ].sort((x, y) => Date.parse(y.date) - Date.parse(x.date));
    setTests(list);
    // Login days, plus any day a test was given.
    setDays(Array.from(new Set([...(d.data || []).map((r: any) => r.day), ...list.map((t) => dayKey(t.date))])));
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const isPro = Boolean(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()));
  const planLabel = !isPro
    ? 'Free user'
    : !profile.pro_expires_at
    ? 'Pro user • Lifetime'
    : `Pro user • till ${new Date(profile.pro_expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const today = dayKey(new Date());
  const { current, best, total } = streaks(days, today);
  const next = MILESTONES.find((m) => m > current);
  const active = new Set(days);

  const [year, month] = today.split('-').map(Number);
  const first = new Date(Date.UTC(year, month - 1 + monthOffset, 1));
  const monthName = first.toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const keyFor = (n: number) => `${first.toISOString().slice(0, 8)}${String(n).padStart(2, '0')}`;

  const types = ['All', ...Array.from(new Set(tests.map((t) => t.type)))];
  const shown = filter === 'All' ? tests : tests.filter((t) => t.type === filter);

  const contact = user ? (isPhoneLogin(user.email) ? user.email.split('@')[0] : user.email) : '';
  const name = profile?.full_name || contact;

  return (
    <div className="min-h-screen pb-16">
      <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <Logo compact />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-4">
        {loading ? (
          <p className="text-center text-sm text-slate-400 py-10">Loading your profile...</p>
        ) : !user ? (
          <div className={`${card} text-center space-y-3`}>
            <p className="text-sm font-bold text-white">Sign in to see your profile.</p>
            <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black">
              Go to Home
            </Link>
          </div>
        ) : (
          <>
            <div className={`${card} flex items-center gap-3`}>
              <div className="w-12 h-12 shrink-0 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-xl font-black uppercase">
                {name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-black text-white truncate">{name}</h1>
                <p className="text-xs text-slate-400 truncate">{contact}</p>
                <button
                  type="button"
                  onClick={() => setProOpen(true)}
                  className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black ${
                    isPro ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {isPro ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {isPro ? planLabel : `${planLabel} • Go Pro`}
                </button>
              </div>
              <button onClick={signOut} title="Sign Out" aria-label="Sign Out" className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              {(['streak', 'tests'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`py-2 rounded-lg text-xs font-black uppercase tracking-wider ${tab === t ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
                >
                  {t === 'streak' ? 'My Streak' : `My Tests (${tests.length})`}
                </button>
              ))}
            </div>

            {failed && <p className="text-xs text-red-400">Some results could not be loaded. Refresh to try again.</p>}

            {tab === 'streak' ? (
              <>
                <div className={`${card} text-center`}>
                  <Flame className={`w-10 h-10 mx-auto ${current ? 'text-amber-400' : 'text-slate-600'}`} />
                  <p className="text-4xl font-black text-white mt-1">{current}</p>
                  <p className="text-xs font-bold text-slate-400">day streak</p>
                  {next && (
                    <>
                      <div className="mt-4 h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${(current / next) * 100}%` }} />
                      </div>
                      <p className="text-xs text-slate-300 mt-2">
                        {next - current} more day{next - current === 1 ? '' : 's'} to your {next}-day badge. Log in daily to keep the streak.
                      </p>
                    </>
                  )}
                  <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {MILESTONES.map((m) => (
                      <span key={m} className={`px-2 py-0.5 rounded text-[10px] font-black ${best >= m ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500'}`}>
                        {m} days
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">Best streak: {best} • Total days: {total}</p>
                </div>

                <div className={card}>
                  <div className="flex items-center justify-between mb-3">
                    <button onClick={() => setMonthOffset((m) => m - 1)} aria-label="Previous month" className="p-1 text-slate-400">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h2 className="text-sm font-bold text-white">{monthName}</h2>
                    <button onClick={() => setMonthOffset((m) => m + 1)} disabled={monthOffset === 0} aria-label="Next month" className="p-1 text-slate-400 disabled:opacity-20">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <span key={i} className="text-slate-500 font-bold">{d}</span>
                    ))}
                    {Array.from({ length: first.getUTCDay() }, (_, i) => <span key={`gap-${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const key = keyFor(i + 1);
                      return (
                        <span
                          key={key}
                          className={`py-2 rounded-lg font-bold ${active.has(key) ? 'bg-amber-500 text-slate-950' : 'bg-slate-950 text-slate-500'} ${key === today ? 'ring-2 ring-white/60' : ''}`}
                        >
                          {i + 1}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">Highlighted dates are days you logged in or gave a test.</p>
                </div>
              </>
            ) : tests.length === 0 ? (
              <div className={`${card} text-center text-sm font-bold text-white`}>No tests given yet.</div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {types.map((t) => (
                    <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1 rounded-full text-[11px] font-black ${filter === t ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}>
                      {t}
                    </button>
                  ))}
                </div>
                {shown.map((t) => (
                  <div key={t.id} className={`${card} space-y-2.5`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase text-amber-400">{t.type}</span>
                        <h3 className="text-sm font-bold text-white">{t.title}</h3>
                        <p className="text-[11px] text-slate-500">{fmt(t.date)}</p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black">{t.score}</span>
                    </div>
                    {t.audio && <audio controls preload="none" src={t.audio} className="w-full h-9" />}
                    <Analysis test={t} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <ProCheckoutModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        userEmail={user?.email}
        isPro={isPro}
        proUntil={profile?.pro_expires_at || null}
        onSuccess={load}
        onRequireAuth={() => router.push('/')}
      />
    </div>
  );
}

function Analysis({ test }: { test: Test }) {
  const p = test.payload || {};
  const a = test.assessment;
  const lines: string[] = [
    ...(a?.scores ? CRITERIA.map((c) => `${c.label}: ${a.scores[c.key]} / 10. ${a.feedback?.[c.key] || ''}`) : []),
    ...(test.type === 'TAT' ? (p.stories || []).map((s: any) => `Slide ${s.slide}: ${s.score} / 10`) : []),
    ...(p.responses || []).map((r: any) => `${r.word || r.situation}: ${r.sentence || r.reaction || '(blank)'}`),
    ...(p.recommendation ? [`Recommendation chance: ${p.recommendation.level}. ${p.recommendation.reason}`] : []),
    ...(a?.strengths || p.strengths || []).map((s: string) => `Strength: ${s}`),
    ...(a?.improvements || p.improvements || []).map((s: string) => `Improve: ${s}`),
  ];

  return (
    <>
      {(lines.length > 0 || test.transcript) && (
        <details className="text-xs text-slate-300">
          <summary className="cursor-pointer font-bold text-amber-400">View analysis</summary>
          <div className="mt-2 space-y-1.5 bg-slate-950 p-3 rounded-lg border border-slate-800">
            {lines.map((line, i) => <p key={i}>{line}</p>)}
            {test.transcript && <p className="text-slate-400">Transcript: {test.transcript}</p>}
          </div>
        </details>
      )}
      {test.type === 'PPDT' && test.transcript && (
        <div className="grid grid-cols-2 gap-2">
          <Link href={`/ppdt/${test.scenarioId}/results`} className="py-2 rounded-lg bg-slate-800 text-white text-center text-xs font-black">
            Results
          </Link>
          <Link href={`/report/${test.id}`} className="py-2 rounded-lg bg-amber-500 text-slate-950 text-center text-xs font-black">
            15-OLQ Report
          </Link>
        </div>
      )}
    </>
  );
}
