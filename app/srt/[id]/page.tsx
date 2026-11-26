'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { getSrtSet, SRT_SECONDS } from '@/lib/srt';
import { SRT_CSS } from '@/components/srt-styles';

type Mode = 'type' | 'write';
type Phase = 'mode' | 'run' | 'done';

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function SrtPage() {
  const params = useParams();
  const set = getSrtSet(Number(params.id || 1));
  const [supabase] = useState(() => createClient());

  const [ready, setReady] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [phase, setPhase] = useState<Phase>('mode');
  const [mode, setMode] = useState<Mode>('type');
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [left, setLeft] = useState(SRT_SECONDS);
  const [saved, setSaved] = useState('');
  const endRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (phase !== 'run') return;
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((endRef.current - Date.now()) / 1000))), 500);
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      clearInterval(t);
      window.removeEventListener('beforeunload', warn);
    };
  }, [phase]);

  useEffect(() => {
    if (phase === 'run' && left <= 0) finish();
  }, [left, phase]);

  useEffect(() => {
    if (phase === 'run' && mode === 'type') inputRef.current?.focus({ preventScroll: true });
    rootRef.current?.scrollTo({ top: 0 });
  }, [phase, idx, mode]);

  const total = set?.situations.length || 0;
  const answered = answers.filter((a) => a?.trim()).length;

  const begin = (m: Mode) => {
    setMode(m);
    setIdx(0);
    setAnswers([]);
    setSaved('');
    setLeft(SRT_SECONDS);
    endRef.current = Date.now() + SRT_SECONDS * 1000;
    setPhase('run');
  };

  const finish = async () => {
    setPhase('done');
    if (!set) return;
    // Paper answers cannot be counted, so only typed attempts go to the Vault.
    if (mode !== 'type' || answered === 0) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { error } = await supabase.from('user_attempts').insert({
        user_id: auth.user.id,
        attempt_type: 'SRT',
        scenario_id: set.id,
        scenario_title: set.title,
        story_score: 0,
        narration_score: 0,
        total_score: answered,
        max_score: total,
        payload: { mode, responses: set.situations.map((situation, i) => ({ situation, reaction: (answers[i] || '').trim() })) },
      });
      setSaved(error ? 'Could not save this attempt to your Vault.' : 'Saved to your Vault.');
    } catch {
      setSaved('Could not save this attempt to your Vault.');
    }
  };

  const confirmFinish = () => {
    const question = mode === 'type' ? `${total - answered} situations are still blank. Finish now?` : 'Finish and view the results?';
    if ((mode === 'type' && answered === total) || window.confirm(question)) finish();
  };

  const shell = (children: React.ReactNode, top?: React.ReactNode) => (
    <div className="sr sr-root" ref={rootRef}>
      <style>{SRT_CSS}</style>
      <div className="sr-wrap">
        <div className="sr-top">
          <Link
            href="/"
            className="sr-link"
            onClick={(e) => {
              if (phase === 'run' && !window.confirm('Leave this test? Your answers will be lost.')) e.preventDefault();
            }}
          >
            ← Exit
          </Link>
          {top || <span className="sr-eyebrow">{set?.title || 'SRT'}</span>}
        </div>
        {children}
      </div>
    </div>
  );

  if (!ready) return shell(<p className="sr-lead">Loading…</p>);
  if (!set) return shell(<p className="sr-lead">This set could not be found.</p>);
  if (!set.is_free && !isPro) {
    return shell(
      <div style={{ paddingTop: 56 }}>
        <p className="sr-eyebrow">Pro set</p>
        <h1 className="sr-h1">{set.title}</h1>
        <p className="sr-lead">Set 01 is free. Go back and unlock Pro to attempt this set.</p>
        <div className="sr-row"><Link href="/" className="sr-btn">Back to home</Link></div>
      </div>
    );
  }

  if (phase === 'mode') {
    return shell(
      <div style={{ paddingTop: 40 }}>
        <p className="sr-eyebrow">Situation Reaction Test</p>
        <h1 className="sr-h1">What would <em>you</em> do?</h1>
        <p className="sr-lead">
          Answer in one to three short sentences. Give realistic, practical steps, in the order you would take them.
        </p>
        <div className="sr-stats">
          <div><b>{total}</b><span>Situations</span></div>
          <div><b>30</b><span>Minutes</span></div>
          <div><b>30s</b><span>Each, on average</span></div>
        </div>
        <div className="sr-modes">
          <button type="button" className="sr-mode" onClick={() => begin('type')}>
            <span className="sr-eyebrow" style={{ color: 'var(--accent)' }}>Option A</span>
            <h3>Type</h3>
            <p>One situation at a time. Type your reaction, move back and forth freely.</p>
            <span className="go">Start the clock →</span>
          </button>
          <button type="button" className="sr-mode" onClick={() => begin('write')}>
            <span className="sr-eyebrow" style={{ color: 'var(--accent)' }}>Option B</span>
            <h3>Write on paper</h3>
            <p>The full booklet of {total} situations on screen. Write your answers on your own sheet.</p>
            <span className="go">Start the clock →</span>
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'run') {
    const timer = <span className={`sr-clock ${left <= 300 ? 'low' : ''}`}>{clock(left)}</span>;
    if (mode === 'write') {
      return shell(
        <>
          <p className="sr-eyebrow" style={{ marginTop: 28 }}>Number your sheet 1 to {total}</p>
          <ol className="sr-sheet sr-list">
            {set.situations.map((s, i) => (
              <li key={i}>
                <span className="n">{i + 1}</span>
                <p className="t">{s} He…</p>
              </li>
            ))}
          </ol>
          <div className="sr-row"><button type="button" className="sr-btn" onClick={confirmFinish}>I have finished</button></div>
        </>,
        timer
      );
    }
    const last = idx === total - 1;
    const go = (i: number) => setIdx(Math.min(total - 1, Math.max(0, i)));
    return shell(
      <>
        <div className="sr-progress"><i style={{ width: `${(answered / total) * 100}%` }} /></div>
        <div className="sr-sheet sr-card">
          <p className="sr-no">{String(idx + 1).padStart(2, '0')}<small>of {total}</small></p>
          <p className="sr-q">{set.situations[idx]} He…</p>
          <textarea
            ref={inputRef}
            rows={3}
            maxLength={500}
            className="sr-input"
            aria-label="Your reaction"
            placeholder="Write your reaction…"
            value={answers[idx] || ''}
            onChange={(e) => {
              const next = [...answers];
              next[idx] = e.target.value;
              setAnswers(next);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!last) go(idx + 1);
              }
            }}
          />
          <div className="sr-row">
            <button type="button" className="sr-btn alt" disabled={idx === 0} onClick={() => go(idx - 1)}>Back</button>
            <button type="button" className="sr-btn" onClick={() => (last ? confirmFinish() : go(idx + 1))}>
              {last ? 'Finish test' : 'Next situation →'}
            </button>
          </div>
        </div>
        <div className="sr-grid">
          {set.situations.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              className={`sr-dot ${answers[i]?.trim() ? 'filled' : ''} ${i === idx ? 'now' : ''}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="sr-row"><button type="button" className="sr-btn alt" onClick={confirmFinish}>Finish test now</button></div>
      </>,
      timer
    );
  }

  return shell(
    <div style={{ paddingTop: 36 }}>
      <p className="sr-eyebrow">Test complete</p>
      <h1 className="sr-h1">{mode === 'type' ? <><em>{answered}</em> of {total} answered</> : <>Check your <em>sheet</em></>}</h1>
      <p className="sr-lead">
        Time used: {clock(SRT_SECONDS - left)}. {mode === 'write' ? 'Compare each situation with what you wrote.' : saved}
      </p>
      <ol className="sr-sheet sr-list">
        {set.situations.map((s, i) => (
          <li key={i}>
            <span className="n">{i + 1}</span>
            <div>
              <p className="t">{s} He…</p>
              {mode === 'type' && (
                <p className={`sr-ans ${answers[i]?.trim() ? '' : 'none'}`}>{answers[i]?.trim() || 'Not answered'}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="sr-row">
        <button type="button" className="sr-btn alt" onClick={() => setPhase('mode')}>Try again</button>
        <Link href="/" className="sr-btn">Back to home</Link>
      </div>
    </div>
  );
}
