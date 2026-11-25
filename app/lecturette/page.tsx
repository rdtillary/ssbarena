'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, ChevronDown, ChevronUp, Mic, RotateCcw, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SpinWheel } from '@/components/SpinWheel';
import { VoiceWave } from '@/components/VoiceWave';
import { ProCheckoutModal } from '@/components/ProCheckoutModal';
import { LecturetteTranscript, type LecturetteAttempt } from '@/components/LecturetteTranscript';
import { CATEGORY_COLORS, LECTURETTE_CATEGORIES, LECTURETTE_SECONDS, type LecturetteTopic } from '@/lib/lecturette-topics';

type Phase = 'HOME' | 'READY' | 'RECORD' | 'WORKING' | 'RESULT';

const UPLOAD_TIMEOUT_MS = 90000;
const STOP_TIMEOUT_MS = 3000;
const LIVE_TRANSCRIPTION = true;

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  return (
    ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find((m) =>
      MediaRecorder.isTypeSupported(m)
    ) || ''
  );
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

const getVisitorId = () => {
  try {
    let id = localStorage.getItem('ssb_visitor_id');
    if (!id) {
      id = newId();
      localStorage.setItem('ssb_visitor_id', id);
    }
    return id;
  } catch {
    return newId();
  }
};

const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function LecturettePage() {
  const supabase = createClient();
  const [phase, setPhase] = useState<Phase>('HOME');
  const [topic, setTopic] = useState<LecturetteTopic | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(LECTURETTE_SECONDS);

  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [proUntil, setProUntil] = useState<string | null>(null);
  const [past, setPast] = useState<LecturetteAttempt[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [proOpen, setProOpen] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [micError, setMicError] = useState('');
  const [liveFinal, setLiveFinal] = useState('');
  const [liveInterim, setLiveInterim] = useState('');
  const [liveNote, setLiveNote] = useState('');
  const [result, setResult] = useState<LecturetteAttempt | null>(null);
  const [resultMsg, setResultMsg] = useState('');
  const [error, setError] = useState('');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef('');
  const startedRef = useRef(0);
  const finishingRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);
  const durationRef = useRef(0);
  const recogRef = useRef<any>(null);
  const recogOnRef = useRef(false);
  const liveBaseRef = useRef('');
  const liveSessionRef = useRef('');
  const liveBoxRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const u = auth?.user || null;
    setUser(u);
    if (u) {
      const { data: profile } = await supabase.from('profiles').select('is_pro, pro_expires_at').eq('id', u.id).single();
      if (profile) {
        setIsPro(Boolean(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())));
        setProUntil(profile.pro_expires_at || null);
      }
      const { data } = await supabase
        .from('lecturette_attempts')
        .select('*')
        .eq('user_id', u.id)
        .order('created_at', { ascending: false });
      setPast((data as LecturetteAttempt[]) || []);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      recogOnRef.current = false;
      try { recogRef.current?.abort(); } catch {}
      try { recorderRef.current?.stream.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, []);

  useEffect(() => {
    const el = liveBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveFinal, liveInterim]);

  const beep = (freq = 880, d = 0.12) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = freq;
      g.gain.value = 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      o.stop(ctx.currentTime + d);
    } catch {}
  };

  // Countdown while recording
  useEffect(() => {
    if (phase !== 'RECORD') return;
    const t = setInterval(() => setSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== 'RECORD') return;
    if (secondsLeft > 0 && secondsLeft <= 5) beep(600, 0.05);
    if (secondsLeft === 0) finish();
  }, [secondsLeft, phase]);

  const freeUsed = !isPro && past.some((a) => a.valid);
  const firstTime = past.length === 0;
  const wheelLabel = freeUsed ? 'Unlock Pro' : firstTime ? 'Attempt your first lecturette' : 'Spin';

  // ---------- recording ----------
  const startRecording = async () => {
    setMicError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = pickMimeType();
      mimeRef.current = mime || 'audio/webm';
      const rec = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.start(1000);
      recorderRef.current = rec;
      startedRef.current = Date.now();
      setStream(media);
      setIsRecording(true);
    } catch {
      setMicError('Microphone is blocked. Allow mic access in your browser and start again.');
    }
  };

  const startLive = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setLiveNote('Live text is not supported on this browser. Your full transcript will appear after you finish.');
      return;
    }
    liveBaseRef.current = '';
    liveSessionRef.current = '';
    recogOnRef.current = true;
    const boot = () => {
      if (!recogOnRef.current) return;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-IN';
      rec.onresult = (e: any) => {
        let fin = '';
        let interim = '';
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin += r[0].transcript + ' ';
          else interim += r[0].transcript;
        }
        liveSessionRef.current = fin;
        setLiveFinal((liveBaseRef.current + fin).trim());
        setLiveInterim(interim);
      };
      rec.onerror = (e: any) => {
        if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
          recogOnRef.current = false;
          setLiveNote('Live text is blocked on this browser. Your full transcript will appear after you finish.');
        }
      };
      rec.onend = () => {
        liveBaseRef.current += liveSessionRef.current;
        liveSessionRef.current = '';
        if (recogOnRef.current) setTimeout(boot, 250);
      };
      recogRef.current = rec;
      try { rec.start(); } catch {}
    };
    boot();
  };

  const stopLive = () => {
    recogOnRef.current = false;
    try { recogRef.current?.stop(); } catch {}
  };

  const stopRecording = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const rec = recorderRef.current;
      const type = mimeRef.current || 'audio/webm';
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        try { rec?.stream.getTracks().forEach((t) => t.stop()); } catch {}
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
      };
      if (!rec || rec.state === 'inactive') return end();
      rec.onstop = end;
      setTimeout(end, STOP_TIMEOUT_MS);
      try { rec.stop(); } catch { end(); }
    });

  const extOf = () => {
    const m = mimeRef.current || 'audio/webm';
    return m.includes('mp4') ? 'mp4' : m.includes('ogg') ? 'ogg' : 'webm';
  };

  const upload = async () => {
    if (!topic) return;
    setPhase('WORKING');
    setError('');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
    try {
      const fd = new FormData();
      if (blobRef.current) fd.append('audio', blobRef.current, `lecturette.${extOf()}`);
      fd.append('topic_id', String(topic.id));
      fd.append('duration_seconds', String(durationRef.current));
      fd.append('visitor_id', getVisitorId());
      const res = await fetch('/api/lecturette/transcribe', { method: 'POST', body: fd, signal: controller.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not process your lecturette. Please retry.');
      setResult(data.attempt);
      setResultMsg(data.message || '');
      setPhase('RESULT');
      load();
    } catch (e: any) {
      setError(e?.name === 'AbortError' ? 'This took too long. Press Retry.' : e?.message || 'Something went wrong.');
      setPhase('RESULT');
      setResult(null);
    } finally {
      clearTimeout(timeout);
    }
  };

  const begin = () => {
    beep();
    setSecondsLeft(LECTURETTE_SECONDS);
    setLiveFinal('');
    setLiveInterim('');
    setLiveNote('');
    finishingRef.current = false;
    setPhase('RECORD');
    startRecording();
    if (LIVE_TRANSCRIPTION) startLive();
  };

  const finish = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    durationRef.current = startedRef.current ? Math.round((Date.now() - startedRef.current) / 1000) : 0;
    stopLive();
    setIsRecording(false);
    setPhase('WORKING');
    blobRef.current = await stopRecording();
    setStream(null);
    await upload();
  };

  const backHome = () => {
    setPhase('HOME');
    setTopic(null);
    setResult(null);
    setError('');
  };

  const onSpun = (t: LecturetteTopic) => {
    beep(660, 0.18);
    setTopic(t);
    setPhase('READY');
  };

  const catColor = topic ? CATEGORY_COLORS[LECTURETTE_CATEGORIES.indexOf(topic.category)] : '#f59e0b';
  const timed = phase === 'RECORD';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        {phase === 'HOME' ? (
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
        ) : (
          <button onClick={backHome} disabled={phase === 'RECORD' || phase === 'WORKING'} className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 disabled:opacity-40">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
        )}
        <span className="text-xs font-black tracking-widest text-slate-200">LECTURETTE</span>
        {timed ? (
          <span className={`px-3 py-1 rounded-lg font-mono font-black text-sm ${secondsLeft <= 10 ? 'bg-red-600 text-white animate-pulse' : 'bg-amber-500/15 text-amber-400'}`}>
            {fmt(secondsLeft)}
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-400">GTO</span>
        )}
      </div>

      {phase === 'HOME' && (
        <>
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-5">
            <div className="text-center space-y-1.5">
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black tracking-widest">
                SPIN • SPEAK • 3 MINUTES
              </span>
              <h1 className="text-2xl font-black text-white">Face the Lecturette Wheel</h1>
              <p className="text-xs text-slate-400">110 topics. One spin. Speak for three full minutes, no notes.</p>
            </div>

            <SpinWheel label={wheelLabel} locked={freeUsed && loaded} onSpun={onSpun} onLockedClick={() => setProOpen(true)} />

            {freeUsed && (
              <p className="text-center text-xs text-amber-300">
                Your free lecturette is used.{' '}
                <button onClick={() => setProOpen(true)} className="font-black underline">Unlock unlimited with Pro</button>
              </p>
            )}
          </div>

          <section className="space-y-3">
            <h2 className="text-lg font-black text-white">Your lecturettes ({past.length})</h2>
            {loaded && past.length === 0 && (
              <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
                <Mic className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">No lecturettes attempted yet</p>
              </div>
            )}
            {past.map((a) => {
              const open = openId === a.id;
              const col = CATEGORY_COLORS[LECTURETTE_CATEGORIES.indexOf(a.category || '')] || '#f59e0b';
              return (
                <div key={a.id} className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden" style={{ borderLeft: `3px solid ${col}` }}>
                  <button onClick={() => setOpenId(open ? null : a.id)} className="w-full p-4 flex items-center justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase" style={{ color: col }}>{a.category}</p>
                      <p className="text-sm font-bold text-white">{a.topic}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {new Date(a.created_at).toLocaleString()} • {a.duration_seconds}s{a.valid === false ? ' • not counted' : ''}
                      </p>
                    </div>
                    {open ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                  </button>
                  {open && <div className="px-4 pb-4"><LecturetteTranscript a={a} /></div>}
                </div>
              );
            })}
          </section>
        </>
      )}

      {(phase === 'READY' || phase === 'RECORD') && topic && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl border text-center space-y-2 bg-slate-900" style={{ borderColor: `${catColor}88`, boxShadow: `0 0 60px -25px ${catColor}` }}>
            <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-widest" style={{ background: `${catColor}33`, color: '#fff' }}>
              {topic.category.toUpperCase()}
            </span>
            <p className="text-[11px] font-bold text-slate-500">YOUR TOPIC</p>
            <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">{topic.title}</h1>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <span className={`inline-flex items-center gap-1.5 text-xs font-black ${phase === 'RECORD' ? 'text-red-400' : 'text-amber-400'}`}>
              <Mic className={`w-4 h-4 ${phase === 'RECORD' ? 'animate-pulse' : ''}`} />
              {phase === 'READY' ? 'PRESS START WHEN YOU ARE READY' : isRecording ? 'RECORDING — SPEAK ON YOUR TOPIC' : 'STARTING MICROPHONE...'}
            </span>

            {micError && (
              <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800 p-2.5 rounded-lg flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {micError}
              </p>
            )}

            <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
              <VoiceWave stream={stream} />
            </div>

            <div ref={liveBoxRef} className="min-h-[110px] max-h-44 overflow-y-auto p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm leading-relaxed">
              {liveFinal || liveInterim ? (
                <p>
                  <span className="text-slate-100">{liveFinal} </span>
                  <span className="text-slate-500">{liveInterim}</span>
                </p>
              ) : (
                <p className="text-slate-600">{phase === 'READY' ? 'Your words will appear here as you speak.' : 'Listening... start speaking.'}</p>
              )}
            </div>
            {liveNote && <p className="text-[11px] text-amber-300">{liveNote}</p>}

            {phase === 'READY' ? (
              <button onClick={begin} className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2">
                <Mic className="w-4 h-4" /> Start Lecturette (3 min)
              </button>
            ) : (
              <button onClick={() => finish()} className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm">
                Finish Lecturette
              </button>
            )}
            <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Transcribing live with AI
            </p>
          </div>
        </div>
      )}

      {phase === 'WORKING' && (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
          <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
          <p className="text-sm font-bold text-white">Transcribing your lecturette...</p>
        </div>
      )}

      {phase === 'RESULT' && (
        <div className="space-y-4">
          {error ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-red-800/60 space-y-3">
              <p className="text-sm font-bold text-red-400 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> {error}</p>
              <div className="flex flex-wrap gap-2">
                {blobRef.current && (
                  <button onClick={upload} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Retry
                  </button>
                )}
                <button onClick={backHome} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">Back</button>
              </div>
            </div>
          ) : result ? (
            <>
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                <div>
                  <p className="text-[11px] font-bold uppercase text-amber-400">Your Lecturette</p>
                  <h2 className="text-lg font-black text-white">{result.topic}</h2>
                </div>
                {resultMsg && <p className="text-sm text-red-400 font-bold">{resultMsg}</p>}
                <LecturetteTranscript a={result} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={backHome} className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" /> Spin again
                </button>
                <Link href="/" className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold">Back to Home</Link>
              </div>
            </>
          ) : null}
        </div>
      )}

      <ProCheckoutModal
        open={proOpen}
        onClose={() => setProOpen(false)}
        userEmail={user?.email}
        isPro={isPro}
        proUntil={proUntil}
        onSuccess={load}
        onRequireAuth={() => {}}
      />
    </div>
  );
}
