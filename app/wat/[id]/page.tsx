'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Keyboard, PenTool, Lock, CheckCircle2, RotateCcw } from 'lucide-react';
import { ProUpsellPopup } from '@/components/ProUpsellPopup';
import { createClient } from '@/lib/supabase/client';
import { getWatSet, WAT_SECONDS, WAT_SETS } from '@/lib/wat-words';
import { GATE_CSS } from '@/components/gate-styles';

type Mode = 'type' | 'write';
type Phase = 'mode' | 'ready' | 'run' | 'done';

const CIRC = 2 * Math.PI * 54;

const WAT_CSS = `
.wt-word{font-family:ui-serif,Georgia,Cambria,'Times New Roman',serif;font-weight:600;letter-spacing:-.03em;line-height:1;
  font-size:clamp(2.6rem,13vw,7.5rem);color:#fff;text-align:center;word-break:break-word;
  text-shadow:0 0 60px rgba(251,191,36,.35);animation:wt-word .5s cubic-bezier(.2,.8,.2,1) both}
@keyframes wt-word{from{opacity:0;transform:translateY(18px) scale(.96);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}
@keyframes wt-ring{from{stroke-dashoffset:0}to{stroke-dashoffset:${CIRC.toFixed(1)}}}
.wt-ring{animation:wt-ring ${WAT_SECONDS}s linear forwards}
.wt-mode{position:relative;display:block;width:100%;text-align:left;padding:26px;border-radius:26px;cursor:pointer;overflow:hidden;
  border:1px solid rgba(148,163,184,.18);background:linear-gradient(150deg,rgba(30,41,59,.7),rgba(15,23,42,.45));
  backdrop-filter:blur(14px);transition:transform .3s ease,border-color .3s ease,box-shadow .3s ease;animation:gt-in .6s cubic-bezier(.2,.8,.2,1) backwards}
.wt-mode:hover{transform:translateY(-5px);border-color:rgba(251,191,36,.7);box-shadow:0 30px 60px -28px rgba(245,158,11,.6)}
.wt-mode .wt-ico{width:54px;height:54px;border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fbbf24;
  background:rgba(251,191,36,.1);border:1px solid rgba(251,191,36,.28);margin-bottom:18px}
.wt-mode h3{font-family:ui-serif,Georgia,serif;font-size:30px;font-weight:600;color:#fff;letter-spacing:-.02em}
.wt-mode p{font-size:13px;color:#94a3b8;margin-top:6px;line-height:1.5}
.wt-textarea{width:100%;resize:none;padding:18px 20px;border-radius:20px;font-size:18px;line-height:1.5;color:#fff;outline:none;
  background:rgba(2,6,23,.65);border:1px solid rgba(148,163,184,.25);transition:border-color .2s,box-shadow .2s}
.wt-textarea:focus{border-color:#f59e0b;box-shadow:0 0 0 5px rgba(245,158,11,.14)}
.wt-row{display:flex;gap:14px;padding:14px 16px;border-radius:16px;background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.14)}
`;

export default function WatPage() {
  const params = useParams();
  const setId = Number(params.id || 1);
  const set = getWatSet(setId);
  const [supabase] = useState(() => createClient());

  const [ready, setReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [phase, setPhase] = useState<Phase>('mode');
  const [mode, setMode] = useState<Mode>('type');
  const [idx, setIdx] = useState(0);
  const [left, setLeft] = useState(WAT_SECONDS);
  const [text, setText] = useState('');
  const [answers, setAnswers] = useState<string[]>([]);
  const [saved, setSaved] = useState('');
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (auth?.user) {
          const { data: p } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', auth.user.id).maybeSingle();
          setIsPro(Boolean(p?.is_pro && (!p.pro_expires_at || new Date(p.pro_expires_at) > new Date())));
        }
      } catch {}
      setReady(true);
    })();
  }, [supabase]);

  const beep = (f = 760, d = 0.07) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const c = new AC();
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = f;
      g.gain.value = 0.06;
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + d);
    } catch {}
  };

  const words = set?.words || [];
  const total = words.length;

  // Write mode: 15 seconds per word, then the next word appears by itself.
  useEffect(() => {
    if (phase !== 'run' || mode !== 'write') return;
    setLeft(WAT_SECONDS);
    const t = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(t);
  }, [phase, mode, idx]);

  useEffect(() => {
    if (phase === 'run' && mode === 'write' && left <= 0) next('');
  }, [left]);

  useEffect(() => {
    if (phase === 'run' && mode === 'type') taRef.current?.focus();
  }, [phase, mode, idx]);

  const finish = async (finalAnswers: string[]) => {
    setPhase('done');
    const responses = words.map((w, i) => ({ word: w, sentence: mode === 'type' ? (finalAnswers[i] || '').trim() : '' }));
    const answered = mode === 'type' ? responses.filter((r) => r.sentence).length : total;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user || !set) return;
      const { error } = await supabase.from('user_attempts').insert({
        user_id: auth.user.id,
        attempt_type: 'WAT',
        scenario_id: set.id,
        scenario_title: set.title,
        story_score: 0,
        narration_score: 0,
        total_score: answered,
        max_score: total,
        payload: { mode, responses },
      });
      setSaved(error ? 'Could not save this attempt.' : 'Saved to your Vault.');
    } catch {
      setSaved('Could not save this attempt.');
    }
  };

  const next = (sentence: string) => {
    const a = [...answers];
    a[idx] = sentence;
    setAnswers(a);
    setText('');
    if (idx + 1 >= total) finish(a);
    else {
      setIdx(idx + 1);
      if (mode === 'write') beep();
    }
  };

  const begin = () => {
    setIdx(0);
    setAnswers([]);
    setText('');
    setLeft(WAT_SECONDS);
    setPhase('run');
    beep(880, 0.12);
  };

  const restart = () => {
    setPhase('mode');
    setIdx(0);
    setAnswers([]);
    setText('');
    setSaved('');
  };

  const shell = (children: React.ReactNode) => (
    <div className="gt-root">
      <style>{GATE_CSS + WAT_CSS}</style>
      <div className="gt-grain" />
      <div className="gt-orb" style={{ width: 380, height: 380, left: '-10%', top: '2%', background: '#f59e0b' }} />
      <div className="gt-orb" style={{ width: 340, height: 340, right: '-8%', bottom: '0%', background: '#6366f1', animationDelay: '-7s' }} />
      <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-5 py-6">{children}</div>
    </div>
  );

  if (!ready) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a12]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
      </div>
    );
  }

  if (!set) {
    return shell(
      <div className="my-auto text-center space-y-4">
        <p className="gt-serif text-3xl text-white">This set could not be found.</p>
        <Link href="/" className="gt-btn inline-block !w-auto px-6">Back to home</Link>
      </div>
    );
  }

  if (!set.is_free && !isPro) {
    return shell(
      <div className="my-auto text-center space-y-5">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="gt-serif text-4xl text-white">{set.title} is a Pro set</h1>
        <p className="text-sm text-slate-400">Set 01 is free. Unlock Pro to practise all 7 sets (420 words).</p>
        <Link href="/" className="gt-btn inline-block !w-auto px-8">Go back &amp; unlock Pro</Link>
      </div>
    );
  }

  const top = (
    <div className="flex items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Exit
      </Link>
      <span className="truncate text-xs font-bold tracking-widest text-slate-300">{set.title.toUpperCase()}</span>
      <span className="w-10" />
    </div>
  );

  if (phase === 'mode') {
    return shell(
      <>
        {top}
        <div className="my-auto py-8">
          <p className="gt-eyebrow gt-in">Word Association Test</p>
          <h1 className="gt-serif gt-in mt-3 text-[40px] leading-[1.05] text-white sm:text-[56px]" style={{ animationDelay: '60ms' }}>
            How will you answer?
          </h1>
          <p className="gt-in mt-3 text-sm text-slate-400" style={{ animationDelay: '120ms' }}>
            {total} words. Write the first natural, positive sentence that comes to mind.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <button type="button" className="wt-mode" style={{ animationDelay: '160ms' }} onClick={() => { setMode('type'); setPhase('ready'); }}>
              <div className="wt-ico"><Keyboard className="h-6 w-6" /></div>
              <h3>Type</h3>
              <p>Type each sentence inside the app and press Next. No timer — take the time you need.</p>
            </button>
            <button type="button" className="wt-mode" style={{ animationDelay: '240ms' }} onClick={() => { setMode('write'); setPhase('ready'); }}>
              <div className="wt-ico"><PenTool className="h-6 w-6" /></div>
              <h3>Write</h3>
              <p>Write on pen and paper. Each word is shown for {WAT_SECONDS} seconds, just like the real test.</p>
            </button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'ready') {
    return shell(
      <>
        {top}
        <div className="my-auto py-8 text-center">
          <p className="gt-eyebrow gt-in">{mode === 'write' ? 'Pen & paper mode' : 'Typing mode'}</p>
          <h1 className="gt-serif gt-in mt-3 text-[40px] leading-[1.05] text-white sm:text-[56px]" style={{ animationDelay: '60ms' }}>
            {mode === 'write' ? 'Get your pen and paper ready.' : 'Ready when you are.'}
          </h1>
          <div className="gt-in gt-glass mx-auto mt-8 max-w-md space-y-2 rounded-3xl p-6 text-left text-sm text-slate-300" style={{ animationDelay: '140ms' }}>
            <p>• {total} words, one at a time</p>
            <p>• {mode === 'write' ? `${WAT_SECONDS} seconds per word, the next word comes automatically` : 'No timer. Write your sentence and press Next'}</p>
            <p>• First thought, positive and meaningful, showing action and OLQs</p>
            <p>• Avoid I / my / me and negative sentences</p>
          </div>
          <div className="mx-auto mt-8 flex max-w-md gap-3">
            <button className="gt-ghost !w-auto px-6" onClick={() => setPhase('mode')}>Back</button>
            <button className="gt-btn" onClick={begin}>Begin</button>
          </div>
        </div>
      </>
    );
  }

  if (phase === 'run') {
    const word = words[idx];
    const urgent = left <= 5;
    return shell(
      <>
        {top}
        <div className="mt-4 flex items-center gap-3">
          <div className="gt-bar on flex-1"><i style={{ width: `${((idx + 1) / total) * 100}%` }} /></div>
          <span className="font-mono text-xs font-bold tracking-widest text-slate-400">
            {String(idx + 1).padStart(2, '0')} <span className="text-slate-600">/ {total}</span>
          </span>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-10 py-8">
          <h2 key={idx} className="wt-word">{word}</h2>

          {mode === 'write' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative h-36 w-36">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
                  <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(148,163,184,.18)" strokeWidth="6" />
                  <circle
                    key={idx}
                    className="wt-ring"
                    cx="60" cy="60" r="54" fill="none"
                    stroke={urgent ? '#ef4444' : '#f59e0b'}
                    strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={CIRC}
                    style={{ transition: 'stroke .3s' }}
                  />
                </svg>
                <span className={`absolute inset-0 flex items-center justify-center font-mono text-5xl font-black tabular-nums ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
                  {Math.max(0, left)}
                </span>
              </div>
              <p className="text-[11px] font-bold tracking-[.25em] text-slate-500">WRITE ON YOUR PAPER</p>
            </div>
          ) : (
            <div className="w-full max-w-xl space-y-4">
              <textarea
                ref={taRef}
                rows={3}
                className="wt-textarea"
                placeholder="Type your sentence…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    next(text);
                  }
                }}
              />
              <button type="button" className="gt-btn" onClick={() => next(text)}>
                {idx + 1 >= total ? 'Finish' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // done
  const nextSet = WAT_SETS.find((s) => s.id === set.id + 1);
  return shell(
    <>
      {top}
      <ProUpsellPopup show />
      <div className="py-8">
        <div className="gt-in flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <span className="gt-eyebrow !text-emerald-400">Set complete</span>
        </div>
        <h1 className="gt-serif gt-in mt-3 text-[38px] leading-[1.05] text-white sm:text-[52px]" style={{ animationDelay: '60ms' }}>
          {mode === 'type' ? 'Your sentences' : 'Check your paper'}
        </h1>
        {saved && <p className="mt-2 text-xs text-slate-400">{saved}</p>}

        <div className="mt-6 space-y-2.5">
          {words.map((w, i) => (
            <div key={i} className="wt-row">
              <span className="w-7 shrink-0 font-mono text-xs font-bold text-slate-500">{String(i + 1).padStart(2, '0')}</span>
              <span className="w-32 shrink-0 text-sm font-black text-amber-400 sm:w-40">{w}</span>
              {mode === 'type' ? (
                <span className={`min-w-0 flex-1 text-sm ${answers[i]?.trim() ? 'text-slate-100' : 'text-slate-600'}`}>
                  {answers[i]?.trim() || '— skipped'}
                </span>
              ) : (
                <span className="flex-1 text-xs text-slate-500">compare with what you wrote</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <button className="gt-ghost !w-auto px-6 inline-flex items-center gap-2" onClick={restart}>
            <RotateCcw className="h-4 w-4" /> Practise this set again
          </button>
          {nextSet && (
            <Link href={`/wat/${nextSet.id}`} className="gt-btn !w-auto px-6 text-center">
              Next: {nextSet.title} →
            </Link>
          )}
          <Link href="/" className="gt-ghost !w-auto px-6 text-center">Back to home</Link>
        </div>
      </div>
    </>
  );
}
