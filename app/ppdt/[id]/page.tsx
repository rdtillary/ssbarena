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
import { VoiceWave } from '@/components/VoiceWave';

type Phase =
  | 'INTRO'
  | 'OBSERVE_30S'
  | 'CHARACTER_60S'
  | 'PAPER_WRITE_240S'
  | 'NARRATE_READY'
  | 'NARRATE_60S'
  | 'REPORT';

const EVAL_TIMEOUT_MS = 50000; // give up waiting for the grader after 50s so Retry always appears
const STOP_TIMEOUT_MS = 3000; // give up waiting for the recorder to stop after 3s

// Live text while speaking uses the browser's speech recognition (free). The final graded
// transcript always comes from the recorded audio. Set to false if a phone's mic conflicts with it.
const LIVE_TRANSCRIPTION = true;

const pickMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((m) => MediaRecorder.isTypeSupported(m)) || '';
};

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;

// Anonymous ID for this browser (never shown to the user). Shared with the visit tracker.
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
  const [stream, setStream] = useState<MediaStream | null>(null);

  const [liveFinal, setLiveFinal] = useState('');
  const [liveInterim, setLiveInterim] = useState('');
  const [liveNote, setLiveNote] = useState('');

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

  const visitorIdRef = useRef('');
  const recPromiseRef = useRef<Promise<string | null> | null>(null);

  const recogRef = useRef<any>(null);
  const recogOnRef = useRef(false);
  const liveBaseRef = useRef('');
  const liveSessionRef = useRef('');
  const liveBoxRef = useRef<HTMLDivElement | null>(null);

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

  // Release the mic and speech recognition if the user leaves the page.
  useEffect(() => {
    return () => {
      recogOnRef.current = false;
      try {
        recogRef.current?.abort();
      } catch {}
      try {
        mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      } catch {}
    };
  }, []);

  useEffect(() => {
    const el = liveBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [liveFinal, liveInterim]);

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
    if (next === 'OBSERVE_30S') {
      visitorIdRef.current = getVisitorId(); // anonymous ID is created the first time Start is pressed
      setSecondsLeft(30);
    }
    if (next === 'CHARACTER_60S') setSecondsLeft(60);
    if (next === 'PAPER_WRITE_240S') setSecondsLeft(240);
    setPhase(next);
  };

  // Narration only begins when the user presses Start on the narration screen.
  const beginNarration = () => {
    playBeep(880, 0.14);
    setSecondsLeft(60);
    setLiveFinal('');
    setLiveInterim('');
    setLiveNote('');
    setPhase('NARRATE_60S');
    startRecording();
    if (LIVE_TRANSCRIPTION) startLiveTranscription();
  };

  // Countdown (the narration-ready screen has no timer)
  useEffect(() => {
    if (phase === 'INTRO' || phase === 'REPORT' || phase === 'NARRATE_READY') return;
    const timer = setInterval(() => setSecondsLeft((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Last-5-seconds beeps
  useEffect(() => {
    if (phase === 'INTRO' || phase === 'REPORT' || phase === 'NARRATE_READY') return;
    if (secondsLeft > 0 && secondsLeft <= 5) playBeep(600, 0.05);
  }, [secondsLeft, phase]);

  // Move on when a timer reaches zero
  useEffect(() => {
    if (secondsLeft > 0) return;
    if (phase === 'OBSERVE_30S') goToPhase('CHARACTER_60S');
    else if (phase === 'CHARACTER_60S') goToPhase('PAPER_WRITE_240S');
    else if (phase === 'PAPER_WRITE_240S') goToPhase('NARRATE_READY');
    else if (phase === 'NARRATE_60S') finishNarration();
  }, [secondsLeft, phase]);

  const startRecording = async () => {
    setMicError('');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const mime = pickMimeType();
      mimeRef.current = mime || 'audio/webm';
      const recorder = mime ? new MediaRecorder(media, { mimeType: mime }) : new MediaRecorder(media);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      narrationStartRef.current = Date.now();
      setStream(media);
      setIsRecording(true);
    } catch {
      setMicError('Microphone is blocked. Allow mic access in your browser and start again.');
    }
  };

  // ---------- live transcription (browser speech recognition) ----------
  const startLiveTranscription = () => {
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
      try {
        rec.start();
      } catch {}
    };
    boot();
  };

  const stopLiveTranscription = () => {
    recogOnRef.current = false;
    try {
      recogRef.current?.stop();
    } catch {}
  };

  // Always resolves: if the recorder never fires "stop", we continue with whatever was captured.
  const stopRecording = (): Promise<Blob | null> =>
    new Promise((resolve) => {
      const rec = mediaRecorderRef.current;
      const type = mimeRef.current || 'audio/webm';
      const build = () => (chunksRef.current.length ? new Blob(chunksRef.current, { type }) : null);
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        try {
          rec?.stream.getTracks().forEach((t) => t.stop());
        } catch {}
        resolve(build());
      };

      if (!rec || rec.state === 'inactive') {
        finish();
        return;
      }
      rec.onstop = finish;
      setTimeout(finish, STOP_TIMEOUT_MS);
      try {
        rec.stop();
      } catch {
        finish();
      }
    });

  const extOf = () => {
    const m = mimeRef.current || 'audio/webm';
    return m.includes('mp4') ? 'mp4' : m.includes('ogg') ? 'ogg' : 'webm';
  };

  // Saves every recording on the server under the anonymous visitor ID (guest or signed in).
  const uploadRecording = async (blob: Blob): Promise<string | null> => {
    try {
      const fd = new FormData();
      fd.append('audio', blob, `narration.${extOf()}`);
      fd.append('visitor_id', visitorIdRef.current || getVisitorId());
      fd.append('scenario_id', String(scenario.id));
      fd.append('scenario_title', scenario.title);
      fd.append('duration_seconds', String(durationRef.current));
      fd.append('main_action', mainAction);
      const res = await fetch('/api/ppdt/recording', { method: 'POST', body: fd });
      const d = await res.json().catch(() => ({}));
      return res.ok ? (d.id as string) : null;
    } catch {
      return null;
    }
  };

  const attachResult = (ev: EvaluationResult) => {
    const p = recPromiseRef.current;
    if (!p) return;
    p.then((id) => {
      if (!id) return;
      fetch('/api/ppdt/recording', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          visitor_id: visitorIdRef.current,
          valid: ev.valid,
          transcript: ev.transcript,
          story_score: ev.storyScore,
          narration_score: ev.narrationScore,
          total_score: ev.totalScore,
        }),
      }).catch(() => {});
    });
  };

  const runEvaluation = async () => {
    const blob = blobRef.current;
    setEvaluating(true);
    setEvalError('');
    setReport(null);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), EVAL_TIMEOUT_MS);

    try {
      const fd = new FormData();
      if (blob) fd.append('audio', blob, `narration.${extOf()}`);
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

      const res = await fetch('/api/ppdt/evaluate', {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Evaluation failed. Please retry.');

      const evalData = data as EvaluationResult;
      setReport(evalData);
      setEvaluating(false); // show the results right away, never wait for saving
      attachResult(evalData);

      if (evalData.valid) {
        // Saving runs in the background; a slow or failed save must not hide the report.
        saveAttempt(evalData, blob).catch(() => {
          setSavedNotice('Could not save this attempt to your Vault.');
        });
      }
    } catch (err: any) {
      setEvalError(
        err?.name === 'AbortError'
          ? 'The AI took too long to respond. Press Retry.'
          : err?.message || 'Evaluation failed. Please retry.'
      );
    } finally {
      clearTimeout(timeout);
      setEvaluating(false);
    }
  };

  const saveAttempt = async (evalData: EvaluationResult, blob: Blob | null) => {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    let uploadedAudioUrl: string | null = null;

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
      const { error: insertErr } = await supabase.from('user_attempts').insert({
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
        // The full result is stored so the user's Results page and the admin can show everything.
        payload: {
          pins,
          mainAction,
          breakdown: evalData.breakdown,
          stammerCount: evalData.stammerCount,
          pauseCount: evalData.pauseCount,
          fillerCount: evalData.fillerCount,
          longestPause: evalData.longestPause,
          wpm: evalData.wpm,
          wordCount: evalData.wordCount,
          strengths: evalData.strengths,
          improvements: evalData.improvements,
          olq: evalData.olq,
          recommendation: evalData.recommendation,
          tokens: evalData.tokens,
        },
      });
      setSavedNotice(insertErr ? 'Could not save this attempt to your Vault.' : 'Saved to your Vault.');
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
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ssb_arena_guest_vault', JSON.stringify(existing.slice(0, 15)));
      } catch {}
      setSavedNotice('Saved on this device. Sign in to keep audio permanently.');
    }
  };

  const finishNarration = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    const started = narrationStartRef.current;
    durationRef.current = started ? Math.round((Date.now() - started) / 1000) : 0;

    stopLiveTranscription();
    setPhase('REPORT');
    setEvaluating(true);
    setIsRecording(false);

    const blob = await stopRecording();
    setStream(null);
    blobRef.current = blob;
    if (blob) setAudioUrl(URL.createObjectURL(blob));

    // Save the recording for the admin right away, in parallel with grading.
    recPromiseRef.current = blob ? uploadRecording(blob) : Promise.resolve(null);
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

  const timed = phase !== 'INTRO' && phase !== 'REPORT' && phase !== 'NARRATE_READY';
  const narrating = phase === 'NARRATE_READY' || phase === 'NARRATE_60S';

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Exit
        </Link>
        <span className="text-xs font-bold text-slate-200 truncate">{scenario.title}</span>
        {timed ? (
          <span
            className={`px-3 py-1 rounded-lg font-mono font-black text-sm ${
              secondsLeft <= 10
                ? 'bg-red-600 text-white animate-pulse'
                : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {formatTime(secondsLeft)}
          </span>
        ) : phase === 'NARRATE_READY' ? (
          <span className="text-xs font-bold text-amber-400">READY</span>
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
            <p>4. <strong>01:00</strong> — Press Start and narrate aloud</p>
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
              onClick={() => goToPhase('NARRATE_READY')}
              className="text-xs text-amber-400 underline"
            >
              Done → Go to Narration
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

      {narrating && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-black ${
              phase === 'NARRATE_60S' ? 'text-red-400' : 'text-amber-400'
            }`}
          >
            <Mic className={`w-4 h-4 ${phase === 'NARRATE_60S' ? 'animate-pulse' : ''}`} />
            {phase === 'NARRATE_READY'
              ? 'NARRATION — PRESS START WHEN YOU ARE READY'
              : isRecording
              ? 'RECORDING — NARRATE YOUR STORY'
              : 'STARTING MICROPHONE...'}
          </span>

          {micError && (
            <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {micError}
            </p>
          )}

          <div className="rounded-xl bg-slate-950 border border-slate-800 px-3 py-2">
            <VoiceWave stream={stream} />
          </div>

          <div
            ref={liveBoxRef}
            className="min-h-[96px] max-h-40 overflow-y-auto p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-sm leading-relaxed"
          >
            {liveFinal || liveInterim ? (
              <p>
                <span className="text-slate-100">{liveFinal} </span>
                <span className="text-slate-500">{liveInterim}</span>
              </p>
            ) : (
              <p className="text-slate-600">
                {phase === 'NARRATE_READY'
                  ? 'Your words will appear here as you speak.'
                  : 'Listening... start speaking.'}
              </p>
            )}
          </div>

          {liveNote && <p className="text-[11px] text-amber-300">{liveNote}</p>}

          {phase === 'NARRATE_READY' ? (
            <button
              onClick={beginNarration}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm flex items-center justify-center gap-2"
            >
              <Mic className="w-4 h-4" /> Start Narration (1 min)
            </button>
          ) : (
            <button
              onClick={() => finishNarration()}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm"
            >
              Finish Narration
            </button>
          )}

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Transcribing live with AI
          </p>
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
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={runEvaluation}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  Restart this PPDT
                </button>
              </div>
            </div>
          ) : report ? (
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

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Retry this PPDT
                    </button>
                    <Link
                      href={`/ppdt/${scenario.id}/results`}
                      className="px-4 py-2 rounded-lg bg-slate-800 text-amber-400 text-xs font-bold"
                    >
                      View Results
                    </Link>
                    <Link
                      href="/"
                      className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold"
                    >
                      Back to Home
                    </Link>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <p className="text-sm font-bold text-white">No result was received.</p>
              <button
                onClick={runEvaluation}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
