'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  PenTool,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PPDT_SCENARIOS } from '@/lib/seed-data';
import { CharacterPin, EvaluationResult, PPDTScenario } from '@/lib/types';
import { HazyProjectorCanvas } from '@/components/HazyProjectorCanvas';
import { OlqAnalysis } from '@/components/OlqAnalysis';

type Phase = 'INTRO' | 'OBSERVE_30S' | 'CHARACTER_60S' | 'PAPER_WRITE_240S' | 'NARRATE_60S' | 'REPORT';

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

export default function PPDTSimulatorPage() {
  const params = useParams();
  const supabase = createClient();
  const scenarioId = Number(params.id || 1);

  const [scenario, setScenario] = useState<PPDTScenario>(
    DEFAULT_PPDT_SCENARIOS.find((s) => s.id === scenarioId) || DEFAULT_PPDT_SCENARIOS[0]
  );
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [secondsLeft, setSecondsLeft] = useState(30);

  // Starts empty: the candidate marks every character (and the hero) themselves.
  const [pins, setPins] = useState<CharacterPin[]>([]);
  const [mainAction, setMainAction] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState('');

  const [evaluating, setEvaluating] = useState(false);
  const [report, setReport] = useState<EvaluationResult | null>(null);
  const [evalError, setEvalError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef('');
  const narrationStartRef = useRef(0);
  const finishingRef = useRef(false);
  const blobRef = useRef<Blob | null>(null);
  const durationRef = useRef(0);
  const savedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('ppdt_scenarios')
        .select('*')
        .eq('id', scenarioId)
        .single();
      if (data) setScenario(data);
    })();
  }, [scenarioId]);

  const playBeep = (freq = 720, duration = 0.08) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  };

  const goToPhase = (next: Phase) => {
    playBeep(880, 0.14);
    if (next === 'OBSERVE_30S') setSecondsLeft(30);
    if (next === 'CHARACTER_60S') setSecondsLeft(60);
    if (next === 'PAPER_WRITE_240S') setSecondsLeft(240);
    if (next === 'NARRATE_60S') {
      setSecondsLeft(60);
      startRecording();
    }
    setPhase(next);
  };

  // Countdown
  useEffect(() => {
    if (phase === 'INTRO' || phase === 'REPORT') return;
    const timer = setInterval(() => setSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Last-5-seconds beeps
  useEffect(() => {
    if (phase === 'INTRO' || phase === 'REPORT') return;
    if (secondsLeft > 0 && secondsLeft <= 5) playBeep(600, 0.05);
  }, [secondsLeft, phase]);

  // Move on when a timer reaches zero
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === 'OBSERVE_30S') goToPhase('CHARACTER_60S');
    else if (phase === 'CHARACTER_60S') goToPhase('PAPER_WRITE_240S');
    else if (phase === 'PAPER_WRITE_240S') goToPhase('NARRATE_60S');
    else if (phase === 'NARRATE_60S') finishNarration();
  }, [secondsLeft, phase]);

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = pickMimeType();
      mimeRef.current = mime || 'audio/webm';
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      narrationStartRef.current = Date.now();
      setIsRecording(true);
    } catch {
      setMicError('Microphone is blocked. Allow mic access in your browser and start again.');
    }
  };

  const stopRecording = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const rec = mediaRecorderRef.current;
      const type = mimeRef.current || 'audio/webm';
      if (!rec || rec.state === 'inactive') {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
        return;
      }
      rec.onstop = () => {
        rec.stream.getTracks().forEach((t) => t.stop());
        resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
      };
      rec.stop();
    });

  const runEvaluation = async () => {
    const blob = blobRef.current;
    setEvaluating(true);
    setEvalError('');
    setReport(null);

    try {
      const ext = (mimeRef.current || 'audio/webm').includes('mp4')
        ? 'mp4'
        : (mimeRef.current || '').includes('ogg')
        ? 'ogg'
        : 'webm';

      const fd = new FormData();
      if (blob) fd.append('audio', blob, `narration.${ext}`);
      fd.append('durationSeconds', String(durationRef.current));
      fd.append(
        'context',
        JSON.stringify({
          scenarioTitle: scenario.title,
          keyCues: scenario.key_cues || [],
          mainAction,
          heroPin: pins.find((p) => p.isHero) || pins[0] || null,
        })
      );

      const res = await fetch('/api/ppdt/evaluate', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Evaluation failed. Please retry.');

      const evalData = data as EvaluationResult;
      setReport(evalData);
      // Save each graded attempt exactly once (a Retry of the grading must not duplicate it).
      if (evalData.valid && !savedRef.current) {
        savedRef.current = true;
        await saveAttempt(evalData, blob);
      }
    } catch (err: any) {
      setEvalError(err?.message || 'Evaluation failed. Please retry.');
    } finally {
      setEvaluating(false);
    }
  };

  const saveAttempt = async (evalData: EvaluationResult, blob: Blob | null) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    let uploadedAudioUrl: string | null = null;

    // Everything needed to show the full result later.
    const payload = {
      pins,
      mainAction,
      breakdown: evalData.breakdown,
      strengths: evalData.strengths,
      improvements: evalData.improvements,
      olq: evalData.olq,
      wpm: evalData.wpm,
      wordCount: evalData.wordCount,
      longestPause: evalData.longestPause,
      stammerCount: evalData.stammerCount,
      pauseCount: evalData.pauseCount,
      fillerCount: evalData.fillerCount,
    };

    if (user && blob) {
      const ext = (mimeRef.current || '').includes('mp4') ? 'mp4' : 'webm';
      const filePath = `${user.id}/${Date.now()}-ppdt-${scenario.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('narration-audio')
        .upload(filePath, blob, { contentType: mimeRef.current || 'audio/webm' });
      if (!uploadErr) {
        const { data: pub } = supabase.storage.from('narration-audio').getPublicUrl(filePath);
        uploadedAudioUrl = pub.publicUrl;
        setAudioUrl(uploadedAudioUrl);
      }
    }

    if (user) {
      const { error } = await supabase.from('user_attempts').insert({
        user_id: user.id,
        attempt_type: 'PPDT',
        scenario_id: scenario.id,
        scenario_title: scenario.title,
        story_score: evalData.storyScore,
        narration_score: evalData.narrationScore,
        total_score: evalData.totalScore,
        max_score: 60,
        transcript: evalData.transcript,
        audio_url: uploadedAudioUrl,
        payload,
      });
      setSavedNotice(error ? 'Could not save this result. Please check your connection.' : 'Result saved to your account.');
    } else {
      try {
        const existing = JSON.parse(localStorage.getItem('ssb_arena_guest_vault') || '[]');
        existing.unshift({
          id: String(Date.now()),
          attempt_type: 'PPDT',
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          story_score: evalData.storyScore,
          narration_score: evalData.narrationScore,
          total_score: evalData.totalScore,
          max_score: 60,
          transcript: evalData.transcript,
          payload,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ssb_arena_guest_vault', JSON.stringify(existing.slice(0, 60)));
      } catch {}
      setSavedNotice('Saved on this device. Sign in to keep results and audio permanently.');
    }
  };

  const finishNarration = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const started = narrationStartRef.current;
    durationRef.current = started ? Math.round((Date.now() - started) / 1000) : 0;

    setPhase('REPORT');
    setEvaluating(true);
    setIsRecording(false);

    const blob = await stopRecording();
    blobRef.current = blob;
    if (blob) setAudioUrl(URL.createObjectURL(blob));
    await runEvaluation();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleBoxClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (pins.length >= 8) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    const nextId = pins.length ? Math.max(...pins.map((p) => p.id)) + 1 : 1;
    setPins([...pins, { id: nextId, x, y, age: 23, sex: 'M', mood: '+', isHero: false }]);
  };

  const removePin = (id: number) => setPins(pins.filter((p) => p.id !== id));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Exit
        </Link>
        <span className="text-xs font-bold text-slate-200 truncate">{scenario.title}</span>
        {phase !== 'INTRO' && phase !== 'REPORT' ? (
          <span
            className={`px-3 py-1 rounded-lg font-mono font-black text-sm ${
              secondsLeft <= 10
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {formatTime(secondsLeft)}
          </span>
        ) : (
          <span className="text-xs font-bold text-emerald-400">STAGE 1</span>
        )}
      </div>

      {phase === 'INTRO' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h1 className="text-xl font-black text-white">{scenario.title}</h1>
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
            <p className="font-bold text-amber-400 flex items-center gap-1.5">
              <PenTool className="w-4 h-4" /> Keep a blank sheet &amp; pen in front of you
            </p>
            <p>1. <strong>00:30</strong> — Observe the picture</p>
            <p>2. <strong>01:00</strong> — Mark characters &amp; main action</p>
            <p>3. <strong>04:00</strong> — Write your story on paper</p>
            <p>4. <strong>01:00</strong> — Narrate aloud</p>
          </div>
          <button
            onClick={() => goToPhase('OBSERVE_30S')}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
          >
            Start
          </button>
        </div>
      )}

      {phase === 'OBSERVE_30S' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Observe</span>
            <button onClick={() => goToPhase('CHARACTER_60S')} className="text-amber-400 underline">
              Skip to Box →
            </button>
          </div>
          <HazyProjectorCanvas imageUrl={scenario.image_url} preset={scenario.scene_preset} />
        </div>
      )}

      {phase === 'CHARACTER_60S' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white">Mark Characters</h2>
            <button
              onClick={() => goToPhase('PAPER_WRITE_240S')}
              className="text-xs text-amber-400 underline"
            >
              Next: Write on Paper →
            </button>
          </div>

          <div
            onClick={handleBoxClick}
            className="relative w-full h-44 bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl cursor-crosshair overflow-hidden"
          >
            {pins.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-sm font-bold text-amber-400/80 animate-pulse">
                  Click here and mark the character
                </p>
              </div>
            )}

            {pins.map((p) => (
              <div
                key={p.id}
                onClick={(e) => e.stopPropagation()}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
                className={`-translate-x-1/2 -translate-y-1/2 absolute px-2 py-0.5 rounded-full text-[11px] font-black ${
                  p.isHero ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-white'
                }`}
              >
                {p.sex}
                {p.age}({p.mood})
              </div>
            ))}
          </div>

          {pins.length > 0 && !pins.some((p) => p.isHero) && (
            <p className="text-xs text-amber-300">
              Now tap <strong>Set Hero</strong> on the main character below.
            </p>
          )}

          <div className="space-y-2">
            {pins.map((pin, index) => (
              <div
                key={pin.id}
                className="flex flex-wrap items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs"
              >
                <span className="font-bold text-slate-400">#{index + 1}</span>
                <input
                  type="number"
                  value={pin.age}
                  onChange={(e) => {
                    const next = [...pins];
                    next[index] = { ...next[index], age: Number(e.target.value) };
                    setPins(next);
                  }}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                />
                <select
                  value={pin.sex}
                  onChange={(e) => {
                    const next = [...pins];
                    next[index] = { ...next[index], sex: e.target.value as any };
                    setPins(next);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="M">M</option>
                  <option value="F">F</option>
                  <option value="P">P</option>
                </select>
                <select
                  value={pin.mood}
                  onChange={(e) => {
                    const next = [...pins];
                    next[index] = { ...next[index], mood: e.target.value as any };
                    setPins(next);
                  }}
                  className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="+">+ (Positive)</option>
                  <option value="0">0 (Neutral)</option>
                  <option value="-">- (Negative)</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setPins(pins.map((item, idx) => ({ ...item, isHero: idx === index })))
                  }
                  className={`ml-auto px-2.5 py-1 rounded font-bold ${
                    pin.isHero ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {pin.isHero ? '★ Hero' : 'Set Hero'}
                </button>
                <button
                  type="button"
                  onClick={() => removePin(pin.id)}
                  className="px-2 py-1 rounded bg-slate-800 text-red-400 font-bold"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Main Action (1 line)"
            value={mainAction}
            onChange={(e) => setMainAction(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
          />
        </div>
      )}

      {phase === 'PAPER_WRITE_240S' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Write on Paper
            </span>
            <button
              onClick={() => goToPhase('NARRATE_60S')}
              className="text-xs text-amber-400 underline"
            >
              Done → Start Narration
            </button>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-2">
            <PenTool className="w-8 h-8 text-amber-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Write Your Story on Paper Now</h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-2.5 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                secondsLeft > 180
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-bold">04:00 – 03:00</p>
              <p className="mt-0.5">Hero &amp; Past Context</p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                secondsLeft <= 180 && secondsLeft > 60
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-bold">03:00 – 01:00</p>
              <p className="mt-0.5">Leadership Actions</p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                secondsLeft <= 60
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-bold">01:00 – 00:00</p>
              <p className="mt-0.5">Positive Outcome</p>
            </div>
          </div>
        </div>
      )}

      {phase === 'NARRATE_60S' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-400">
            <Mic className="w-4 h-4 animate-pulse" />
            {isRecording ? 'RECORDING — NARRATE YOUR STORY' : 'STARTING MICROPHONE...'}
          </span>

          {micError && (
            <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {micError}
            </p>
          )}

          <button
            onClick={() => finishNarration()}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm"
          >
            Finish Narration
          </button>
        </div>
      )}

      {phase === 'REPORT' && (
        <div className="space-y-5">
          {evaluating ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-sm font-bold text-white">Transcribing &amp; analysing your narration...</p>
            </div>
          ) : evalError ? (
            <div className="p-6 rounded-2xl bg-slate-900 border border-red-800/60 space-y-3">
              <p className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> {evalError}
              </p>
              <button
                onClick={runEvaluation}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          ) : (
            report && (
              <>
                {!report.valid ? (
                  <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <h2 className="text-xl font-black text-white">Score: 0 / 60</h2>
                    <p className="text-sm text-red-400 font-bold">{report.message}</p>
                    {audioUrl && <audio controls src={audioUrl} className="w-full h-9" />}
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Try Again
                    </button>
                  </div>
                ) : (
                  <>
                    {report.olq && <OlqAnalysis olq={report.olq} />}

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h2 className="text-xl font-black text-white">
                          Total Score: {report.totalScore} / 60
                        </h2>
                        <div className="flex gap-2 text-xs font-bold">
                          <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
                            Story: {report.storyScore}/40
                          </span>
                          <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">
                            Narration: {report.narrationScore}/20
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {report.wordCount} words
                        </span>
                        <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                          {report.wpm} WPM
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
                          {report.pauseCount} pauses
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
                          {report.stammerCount} stammers
                        </span>
                        <span className="px-2.5 py-1 rounded bg-red-950/40 border border-red-900/60 text-red-400">
                          {report.fillerCount} fillers
                        </span>
                      </div>

                      {savedNotice && (
                        <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" /> {savedNotice}
                        </p>
                      )}

                      {audioUrl && <audio controls src={audioUrl} className="w-full h-9" />}

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                        <p className="text-xs font-bold text-slate-400">
                          Transcript <span className="text-red-400 font-normal">(red = stammer / filler / pause)</span>
                        </p>
                        <p className="text-sm text-slate-200 leading-loose">
                          {report.tokens.map((t, i) =>
                            t.type === 'pause' ? (
                              <span
                                key={i}
                                className="mx-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[11px] font-bold"
                              >
                                ⏸ {t.text}
                              </span>
                            ) : t.type === 'word' ? (
                              <span key={i}>{t.text} </span>
                            ) : (
                              <span key={i}>
                                <span className="px-0.5 rounded bg-red-500/20 text-red-400 font-bold underline decoration-red-500">
                                  {t.text}
                                </span>{' '}
                              </span>
                            )
                          )}
                        </p>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                          <p className="font-bold text-emerald-400">Strengths</p>
                          {report.strengths.length === 0 && <p className="text-slate-400">—</p>}
                          {report.strengths.map((s, i) => (
                            <p key={i} className="text-slate-300">• {s}</p>
                          ))}
                        </div>
                        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1">
                          <p className="font-bold text-amber-400">Improvements</p>
                          {report.improvements.map((imp, i) => (
                            <p key={i} className="text-slate-300">• {imp}</p>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          onClick={() => window.location.reload()}
                          className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Retry this picture
                        </button>
                        <Link
                          href="/"
                          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                        >
                          Back to Home
                        </Link>
                      </div>
                    </div>

                    <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base font-black text-amber-400">
                          Recommended Candidate Response
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {scenario.olq_highlights?.map((olq, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300"
                            >
                              {olq}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {scenario.recommended_story}
                      </p>
                    </div>
                  </>
                )}
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
