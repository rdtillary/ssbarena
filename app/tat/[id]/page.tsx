'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock, Mic, RotateCcw, Square } from 'lucide-react';
import { ProUpsellPopup } from '@/components/ProUpsellPopup';
import { createClient } from '@/lib/supabase/client';
import {
  getTatSet,
  TAT_CRITERIA,
  TAT_MAX_NARRATION_SECONDS,
  TAT_PICTURES,
  TAT_SLIDES,
  TAT_VIEW_SECONDS,
  TAT_WRITE_SECONDS,
  type TatResult,
} from '@/lib/tat';

type Phase = 'intro' | 'view' | 'write' | 'done';
type Story = { status: 'working' | 'done' | 'error'; result?: TatResult; error?: string };

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

export default function TatPage() {
  const params = useParams();
  const set = getTatSet(Number(params.id || 1));
  const [supabase] = useState(() => createClient());

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isPro, setIsPro] = useState(false);
  const [pictures, setPictures] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>('intro');
  const [slide, setSlide] = useState(0);
  const [left, setLeft] = useState(TAT_VIEW_SECONDS);
  const [mic, setMic] = useState<'idle' | 'starting' | 'recording'>('idle');
  const [micError, setMicError] = useState('');
  const [stories, setStories] = useState<Record<number, Story>>({});
  const [saved, setSaved] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const blobsRef = useRef<Record<number, Blob>>({});
  const savedRef = useRef(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!set) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        const { data: p } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', auth.user.id).maybeSingle();
        setIsPro(Boolean(p?.is_pro && (!p.pro_expires_at || new Date(p.pro_expires_at) > new Date())));
      }
      // The picture order was shuffled once in the database, so a mock never changes.
      const { data: row } = await supabase.from('tat_sets').select('scenario_ids').eq('id', set.id).maybeSingle();
      const ids: number[] = row?.scenario_ids || [];
      const { data: rows } = await supabase.from('ppdt_scenarios').select('id, image_url').in('id', ids);
      const urls = ids.map((id) => rows?.find((r) => r.id === id)?.image_url).filter(Boolean) as string[];
      if (urls.length === TAT_PICTURES) {
        urls.forEach((u) => {
          new Image().src = u;
        });
        setPictures(urls);
      } else {
        setLoadError('This mock is not ready yet. Please try again later.');
      }
      setLoading(false);
    })();
  }, [set?.id]);

  const beep = (freq = 760) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const c = new AC();
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.value = freq;
      g.gain.value = 0.07;
      o.connect(g);
      g.connect(c.destination);
      o.start();
      o.stop(c.currentTime + 0.12);
      o.onended = () => c.close();
    } catch {}
  };

  const startPhase = (next: 'view' | 'write', index: number) => {
    beep(next === 'view' ? 880 : 660);
    setSlide(index);
    setLeft(next === 'view' ? TAT_VIEW_SECONDS : TAT_WRITE_SECONDS);
    setMicError('');
    setPhase(next);
  };

  // The countdown stands still while the microphone is on.
  const running = (phase === 'view' || phase === 'write') && mic === 'idle';
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const t = setInterval(() => setLeft(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    return () => clearInterval(t);
  }, [running, phase, slide]);

  useEffect(() => {
    if (left > 0 || !running) return;
    if (phase === 'view') startPhase('write', slide);
    else if (slide + 1 < TAT_SLIDES) startPhase('view', slide + 1);
    else {
      beep(520);
      setPhase('done');
    }
  }, [left, running]);

  const evaluate = async (index: number) => {
    const blob = blobsRef.current[index];
    if (!blob || !set) return;
    setStories((s) => ({ ...s, [index]: { status: 'working' } }));
    try {
      const fd = new FormData();
      fd.append('audio', blob, `story.${blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'}`);
      fd.append('set_id', String(set.id));
      fd.append('slide', String(index + 1));
      const res = await fetch('/api/tat/evaluate', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not transcribe this story.');
      setStories((s) => ({ ...s, [index]: { status: 'done', result: data as TatResult } }));
    } catch (e: any) {
      setStories((s) => ({ ...s, [index]: { status: 'error', error: e?.message || 'Could not transcribe this story.' } }));
    }
  };

  const narrate = async () => {
    const index = slide;
    setMicError('');
    setMic('starting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      if (!aliveRef.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      const mime = pickMime();
      const rec = new MediaRecorder(media, { ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: 48000 });
      const chunks: BlobPart[] = [];
      let limit: ReturnType<typeof setTimeout>;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = () => {
        clearTimeout(limit);
        media.getTracks().forEach((t) => t.stop());
        if (!aliveRef.current) return;
        setMic('idle');
        blobsRef.current[index] = new Blob(chunks, { type: mime || 'audio/webm' });
        evaluate(index);
      };
      rec.start(1000);
      limit = setTimeout(() => rec.state !== 'inactive' && rec.stop(), TAT_MAX_NARRATION_SECONDS * 1000);
      recorderRef.current = rec;
      setMic('recording');
    } catch {
      setMic('idle');
      setMicError('Microphone is blocked. Allow mic access in your browser to narrate.');
    }
  };

  const stopNarration = () => {
    const rec = recorderRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
  };

  const marked = Object.entries(stories).filter(([, s]) => s.status === 'done' && s.result?.score != null);
  const total = marked.reduce((sum, [, s]) => sum + (s.result!.score as number), 0);
  const pending = Object.values(stories).some((s) => s.status !== 'done');

  // Save once, after every narrated story has been marked.
  const save = async () => {
    if (savedRef.current || !set || marked.length === 0) return;
    savedRef.current = true;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;
    const { error } = await supabase.from('user_attempts').insert({
      user_id: auth.user.id,
      attempt_type: 'TAT',
      scenario_id: set.id,
      scenario_title: set.title,
      story_score: total,
      narration_score: 0,
      total_score: total,
      max_score: marked.length * 10,
      payload: { stories: marked.map(([i, s]) => ({ slide: Number(i) + 1, ...s.result })) },
    });
    if (error) savedRef.current = false;
    setSaved(error ? 'Could not save this attempt to your Vault.' : 'Saved to your Vault.');
  };

  useEffect(() => {
    if (phase === 'done' && !pending) save();
  }, [phase, pending]);

  const shell = (children: React.ReactNode) => (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-[#070a12]">
      <div className="mx-auto flex min-h-full max-w-3xl flex-col px-5 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Exit
          </Link>
          <span className="text-xs font-bold uppercase tracking-widest text-slate-300">{set?.title || 'TAT'}</span>
        </div>
        {children}
      </div>
    </div>
  );
  const primary = 'rounded-xl bg-amber-500 px-6 py-3 text-sm font-black text-slate-950 hover:bg-amber-400';
  const message = (text: string) => shell(<p className="my-auto text-center text-sm text-slate-300">{text}</p>);

  if (loading) return message('Loading…');
  if (!set) return message('This mock could not be found.');
  if (!set.is_free && !isPro) {
    return shell(
      <div className="my-auto space-y-4 text-center">
        <Lock className="mx-auto h-8 w-8 text-amber-400" />
        <p className="text-sm text-slate-300">{set.title} is a Pro mock. TAT Mock 01 is free.</p>
        <Link href="/" className={`${primary} inline-block`}>Go back &amp; unlock Pro</Link>
      </div>
    );
  }
  if (loadError) return message(loadError);

  if (phase === 'intro') {
    return shell(
      <div className="my-auto space-y-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white">Thematic Apperception Test</h1>
        <div className="mx-auto max-w-md space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left text-sm text-slate-300">
          <p>• {TAT_SLIDES} slides: {TAT_PICTURES} pictures and 1 blank slide</p>
          <p>• Look at each slide for {TAT_VIEW_SECONDS} seconds, then write your story on paper in 4 minutes</p>
          <p>• Slides move on by themselves, about 54 minutes in all</p>
          <p>• Optional: press “Narrate story” while writing. The timer stops until you stop narrating</p>
          <p>• Only narrated stories are transcribed and marked, each out of 10</p>
        </div>
        <p className="text-xs text-slate-500">Keep paper and pen ready. Leaving this page ends the mock.</p>
        <button type="button" className={primary} onClick={() => startPhase('view', 0)}>Start mock</button>
      </div>
    );
  }

  if (phase === 'view' || phase === 'write') {
    const blank = slide >= TAT_PICTURES;
    const story = stories[slide];
    return shell(
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-6">
        <p className="font-mono text-xs font-bold tracking-widest text-slate-400">
          SLIDE {slide + 1} / {TAT_SLIDES} · {phase === 'view' ? 'OBSERVE' : 'WRITE'}
        </p>
        <p className={`font-mono text-5xl font-black tabular-nums ${left <= 10 ? 'text-red-400' : 'text-amber-400'}`}>{clock(left)}</p>

        {phase === 'view' ? (
          <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-700 bg-white">
            {!blank && (
              <img
                src={pictures[slide]}
                alt={`TAT slide ${slide + 1}`}
                className="pointer-events-none h-full w-full select-none object-cover blur-[1.4px] contrast-75 grayscale"
              />
            )}
          </div>
        ) : (
          <div className="w-full max-w-md space-y-4 text-center">
            <p className="text-lg font-bold text-white">
              {blank ? 'Blank slide: write a story of your own.' : 'Write your story on paper.'}
            </p>
            {mic === 'recording' ? (
              <>
                <p className="animate-pulse text-xs font-bold text-red-400">Recording · timer stopped</p>
                <button type="button" onClick={stopNarration} className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-6 py-3 text-sm font-black text-white">
                  <Square className="h-4 w-4 fill-current" /> Stop narrating
                </button>
              </>
            ) : (
              <button type="button" onClick={narrate} disabled={mic === 'starting'} className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-slate-900 px-6 py-3 text-sm font-black text-amber-400 disabled:opacity-50">
                <Mic className="h-4 w-4" /> {story ? 'Narrate again' : 'Narrate story (optional)'}
              </button>
            )}
            {story && mic === 'idle' && <p className="text-xs text-slate-400">Narration recorded. You will see it at the end.</p>}
            {micError && <p className="text-xs text-red-400">{micError}</p>}
          </div>
        )}
      </div>
    );
  }

  return shell(
    <div className="space-y-4 py-8">
      <ProUpsellPopup show={!pending} />
      <h1 className="text-3xl font-black text-white">Mock complete</h1>
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        {marked.length > 0 ? (
          <>
            <p className="text-4xl font-black text-emerald-400">{total} / {marked.length * 10}</p>
            <p className="mt-1 text-xs text-slate-400">{marked.length} of {TAT_SLIDES} stories marked, 10 marks each.</p>
          </>
        ) : (
          <p className="text-sm text-slate-300">{pending ? 'Marking your stories…' : 'No result: no story was transcribed.'}</p>
        )}
        {saved && <p className="mt-2 text-xs text-slate-400">{saved}</p>}
        {!pending && marked.length > 0 && !saved && <p className="mt-2 text-xs text-slate-500">Saving…</p>}
        {Object.values(stories).some((s) => s.status === 'error') && (
          <p className="mt-2 text-xs text-amber-400">Retry the failed stories below to save this attempt.</p>
        )}
      </div>

      {Array.from({ length: TAT_SLIDES }, (_, i) => {
        const s = stories[i];
        const r = s?.result;
        return (
          <div key={i} className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {i < TAT_PICTURES ? (
                  <img src={pictures[i]} alt="" className="h-12 w-16 rounded object-cover grayscale" />
                ) : (
                  <div className="h-12 w-16 rounded bg-white" />
                )}
                <p className="text-sm font-bold text-white">Story {i + 1}{i >= TAT_PICTURES ? ' (blank)' : ''}</p>
              </div>
              <span className="text-sm font-black text-emerald-400">
                {r?.score != null ? `${r.score} / 10` : s?.status === 'working' ? 'Marking…' : <span className="text-slate-500">No result</span>}
              </span>
            </div>
            {r?.transcript && <p className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">{r.transcript}</p>}
            {r?.breakdown && (
              <p className="text-[11px] text-slate-400">
                {TAT_CRITERIA.map((c) => `${c.label} ${r.breakdown![c.key]}/2`).join(' · ')}
              </p>
            )}
            {r?.feedback && <p className="text-xs text-amber-300">{r.feedback}</p>}
            {s?.status === 'error' && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-red-400">{s.error}</p>
                <button type="button" onClick={() => evaluate(i)} className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                  <RotateCcw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            )}
          </div>
        );
      })}
      <Link href="/" className={`${primary} block text-center`}>Back to home</Link>
    </div>
  );
}
