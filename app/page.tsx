'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Play,
  Lock,
  Mic,
  Timer,
  Archive,
  Shield,
  LogOut,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PPDT_SCENARIOS, DEFAULT_OIR_SETS } from '@/lib/seed-data';
import { PRO_PRICE_INR } from '@/lib/config';
import { getCentre } from '@/lib/ssb-centres';
import { PPDTScenario, RecommendedCandidate, UserAttempt } from '@/lib/types';
import { Logo } from '@/components/Logo';
import { AuthModal } from '@/components/AuthModal';
import { ProCheckoutModal } from '@/components/ProCheckoutModal';
import { Carousel } from '@/components/Carousel';
import { RecommendedSlide } from '@/components/RecommendedSlide';
import { ReportingTimer } from '@/components/ReportingTimer';

export default function HomePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<'home' | 'ppdt' | 'oir' | 'vault'>('home');
  const [scenarios, setScenarios] = useState<PPDTScenario[]>(DEFAULT_PPDT_SCENARIOS);
  const [attempts, setAttempts] = useState<UserAttempt[]>([]);
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [centre, setCentre] = useState('');
  const [reportingDate, setReportingDate] = useState('');
  const [centreImages, setCentreImages] = useState<Record<string, string>>({});
  const [candidates, setCandidates] = useState<RecommendedCandidate[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [proOpen, setProOpen] = useState(false);

  const isAdmin =
    user?.email &&
    process.env.NEXT_PUBLIC_ADMIN_EMAIL &&
    user.email.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase();

  const loadData = async () => {
    const { data: dbScenarios } = await supabase
      .from('ppdt_scenarios')
      .select('*')
      .order('id', { ascending: true });
    if (dbScenarios && dbScenarios.length > 0) {
      setScenarios(dbScenarios);
    }

    const { data: centreRows } = await supabase.from('ssb_centres').select('code, image_url');
    if (centreRows) {
      const map: Record<string, string> = {};
      centreRows.forEach((r: any) => {
        if (r.image_url) map[r.code] = r.image_url;
      });
      setCentreImages(map);
    }

    const { data: candidateRows } = await supabase
      .from('recommended_candidates')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true });
    if (candidateRows) setCandidates(candidateRows);

    const { data: authData } = await supabase.auth.getUser();
    const currentUser = authData?.user || null;
    setUser(currentUser);

    if (currentUser) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (profile) {
        const activePro =
          profile.is_pro &&
          (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date());
        setIsPro(Boolean(activePro));
        if (profile.target_board && getCentre(profile.target_board)) {
          setCentre(profile.target_board);
          if (profile.reporting_date) setReportingDate(profile.reporting_date);
        }
      }

      const { data: userAttempts } = await supabase
        .from('user_attempts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });
      if (userAttempts) setAttempts(userAttempts);
    } else {
      const localVault = JSON.parse(localStorage.getItem('ssb_arena_guest_vault') || '[]');
      setAttempts(localVault);
    }
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ssb_arena_target') || 'null');
      if (saved?.centre && getCentre(saved.centre)) {
        setCentre(saved.centre);
        setReportingDate(saved.date || '');
      }
    } catch {}
    loadData();
  }, []);

  const handleSaveTarget = async (code: string, date: string) => {
    setCentre(code);
    setReportingDate(date);
    try {
      localStorage.setItem('ssb_arena_target', JSON.stringify({ centre: code, date }));
    } catch {}
    if (user) {
      await supabase
        .from('profiles')
        .update({ target_board: code, reporting_date: date })
        .eq('id', user.id);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsPro(false);
  };

  const heroSlide = (
    <section className="h-full flex flex-col justify-center p-6 sm:p-8 pb-10 sm:pb-12 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800">
      <span className="self-start px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold mb-3">
        NO TYPING • REAL PAPER &amp; VOICE NARRATION FLOW
      </span>
      <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
        Practice Real Day-1 SSB Screening Under Exact Exam Timers.
      </h1>
      <p className="text-slate-400 text-sm sm:text-base mt-3 max-w-2xl">
        30-second hazy projector view → 1-minute character box → 4-minute{' '}
        <strong className="text-slate-200">pen-on-paper</strong> story writing → 1-minute{' '}
        <strong className="text-slate-200">spoken narration</strong> with automatic AI
        transcription, OLQ grading &amp; saved audio vault.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/ppdt/1"
          className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center gap-2 transition"
        >
          <Play className="w-4 h-4 fill-current" /> Start Free PPDT #01
        </Link>
        <Link
          href="/oir/1"
          className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center gap-2 transition"
        >
          <Timer className="w-4 h-4 text-amber-400" /> Take 10-Min OIR Drill
        </Link>
      </div>
    </section>
  );

  // Recommended candidates: 4 per slide.
  const candidateChunks: RecommendedCandidate[][] = [];
  for (let i = 0; i < candidates.length; i += 4) {
    candidateChunks.push(candidates.slice(i, i + 4));
  }
  if (candidateChunks.length === 0) candidateChunks.push([]);

  const slides = [
    heroSlide,
    ...candidateChunks.map((chunk, i) => <RecommendedSlide key={i} candidates={chunk} />),
  ];

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-2">
          <Logo />

          <nav className="hidden md:flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {(['home', 'ppdt', 'oir', 'vault'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
                  activeTab === tab
                    ? 'bg-amber-500 text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold hover:bg-red-600/30"
              >
                Admin
              </Link>
            )}

            {isPro ? (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> PRO ACTIVE
              </span>
            ) : (
              <button
                onClick={() => setProOpen(true)}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Pro ₹{PRO_PRICE_INR}
              </button>
            )}

            {user ? (
              <button
                onClick={handleSignOut}
                title="Sign Out"
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-semibold text-slate-200 hover:border-amber-500"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        <div className="space-y-3">
          {activeTab === 'home' && <Carousel slides={slides} />}

          <ReportingTimer
            centreCode={centre}
            reportingDate={reportingDate}
            imageUrl={centreImages[centre]}
            onSave={handleSaveTarget}
          />
          <p className="text-[11px] text-slate-500 text-center">
            Keep a blank sheet &amp; pen ready before starting PPDT
          </p>
        </div>

        {activeTab === 'home' && (
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs font-bold text-amber-400 uppercase">Step 1 • Paper Story</p>
              <p className="text-sm font-bold text-white mt-1">Write on Real Paper (4 Min)</p>
              <p className="text-xs text-slate-400 mt-1">
                Builds real handwriting speed instead of unnatural keyboard typing.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs font-bold text-emerald-400 uppercase">Step 2 • Auto Transcript</p>
              <p className="text-sm font-bold text-white mt-1">1-Min Voice Narration</p>
              <p className="text-xs text-slate-400 mt-1">
                Records your voice, converts speech to text live, and saves audio to your Vault.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <p className="text-xs font-bold text-sky-400 uppercase">Step 3 • AI OLQ Report</p>
              <p className="text-sm font-bold text-white mt-1">Compare with Recommended Story</p>
              <p className="text-xs text-slate-400 mt-1">
                Evaluates WPM pace, filler words, hero action, and unlocks recommended responses.
              </p>
            </div>
          </div>
        )}

        {(activeTab === 'home' || activeTab === 'ppdt') && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                PPDT Projector Scenarios ({scenarios.length})
              </h2>
              {!isPro && (
                <button
                  onClick={() => setProOpen(true)}
                  className="text-xs font-bold text-amber-400 hover:underline"
                >
                  Unlock all for ₹{PRO_PRICE_INR} (lifetime) →
                </button>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-3.5">
              {scenarios.map((sc) => {
                const locked = !sc.is_free && !isPro;
                return (
                  <div
                    key={sc.id}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded ${
                            sc.is_free
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-amber-500/15 text-amber-400'
                          }`}
                        >
                          {sc.is_free ? 'FREE' : 'PRO'}
                        </span>
                        <span className="text-[11px] text-slate-500">{sc.difficulty}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white mt-1.5">{sc.title}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        30s View • 1m Box • 4m Paper • 1m Voice
                      </p>
                    </div>

                    {locked ? (
                      <button
                        onClick={() => setProOpen(true)}
                        className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0"
                      >
                        <Lock className="w-3.5 h-3.5" /> Unlock
                      </button>
                    ) : (
                      <Link
                        href={`/ppdt/${sc.id}`}
                        className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Start
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {(activeTab === 'home' || activeTab === 'oir') && (
          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">OIR Speed Drills (10-Min Timer)</h2>
            <div className="grid sm:grid-cols-2 gap-3.5">
              {DEFAULT_OIR_SETS.map((set) => (
                <div
                  key={set.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400">
                      FREE BENCHMARK
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1.5">{set.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      20 Questions • Live 45s+ Time-Trap Alerts
                    </p>
                  </div>
                  <Link
                    href={`/oir/${set.id}`}
                    className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shrink-0"
                  >
                    Start OIR
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'vault' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black text-white">
                Saved Narration Audio &amp; AI Reports ({attempts.length})
              </h2>
              {!user && (
                <button
                  onClick={() => setAuthOpen(true)}
                  className="text-xs font-bold text-amber-400 underline"
                >
                  Sign in to sync across devices
                </button>
              )}
            </div>

            {attempts.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <Mic className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">No recorded drills yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Complete any PPDT drill to save your 1-minute narration audio, transcript, and AI
                  score report here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-amber-400">
                          {att.attempt_type}
                        </span>
                        <h3 className="text-sm font-bold text-white">{att.scenario_title}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-black">
                        {att.total_score} / {att.max_score}
                      </span>
                    </div>

                    {att.audio_url && (
                      <audio controls src={att.audio_url} className="w-full h-9" />
                    )}

                    {att.transcript && (
                      <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                        <strong className="text-slate-400">Auto-Transcript: </strong>
                        {att.transcript}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-950/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 h-14">
        {[
          { id: 'home', label: 'Home', icon: Shield },
          { id: 'ppdt', label: 'PPDT', icon: Play },
          { id: 'oir', label: 'OIR', icon: Timer },
          { id: 'vault', label: 'Vault', icon: Archive },
        ].map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold ${
                active ? 'text-amber-400' : 'text-slate-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={loadData} />
      <ProCheckoutModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        userEmail={user?.email}
        onSuccess={loadData}
        onRequireAuth={() => setAuthOpen(true)}
      />
    </div>
  );
}
