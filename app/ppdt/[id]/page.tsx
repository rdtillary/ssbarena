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
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_PPDT_SCENARIOS } from '@/lib/seed-data';
import { CharacterPin, EvaluationResult, PPDTScenario } from '@/lib/types';
import { HazyProjectorCanvas } from '@/components/HazyProjectorCanvas';

type Phase = 'INTRO' | 'OBSERVE_30S' | 'CHARACTER_60S' | 'PAPER_WRITE_240S' | 'NARRATE_60S' | 'REPORT';

export default function PPDTSimulatorPage() {
  const params = useParams();
  const supabase = createClient();
  const scenarioId = Number(params.id || 1);

  const [scenario, setScenario] = useState<PPDTScenario>(
    DEFAULT_PPDT_SCENARIOS.find((s) => s.id === scenarioId) || DEFAULT_PPDT_SCENARIOS[0]
  );
  const [phase, setPhase] = useState<Phase>('INTRO');
  const [secondsLeft, setSecondsLeft] = useState(30);

  const [pins, setPins] = useState<CharacterPin[]>([
    { id: 1, x: 45, y: 48, age: 24, sex: 'M', mood: '+', isHero: true },
  ]);
  const [mainAction, setMainAction] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState('');

  const [evaluating, setEvaluating] = useState(false);
  const [report, setReport] = useState<EvaluationResult | null>(null);
  const [savedNotice, setSavedNotice] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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
      startRecordingAndTranscription();
    }
    setPhase(next);
  };

  useEffect(() => {
    if (phase === 'INTRO' || phase === 'REPORT') return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 6 && prev > 1) playBeep(600, 0.05);
        if (prev <= 1) {
          clearInterval(timer);
          if (phase === 'OBSERVE_30S') goToPhase('CHARACTER_60S');
          else if (phase === 'CHARACTER_60S') goToPhase('PAPER_WRITE_240S');
          else if (phase === 'PAPER_WRITE_240S') goToPhase('NARRATE_60S');
          else if (phase === 'NARRATE_60S') finishNarrationAndEvaluate(60);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase]);

  const startRecordingAndTranscription = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      setMicError('Mic permission blocked — you can still speak & review your transcript.');
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';
      recognition.onresult = (event: any) => {
        let finalText = '';
        for (let i = 0; i < event.results.length; i++) {
          finalText += event.results[i][0].transcript + ' ';
        }
        setTranscript(finalText.trim());
      };
      recognition.start();
      recognitionRef.current = recognition;
    }
  };

  const stopRecordingAndTranscription = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
  };

  const finishNarrationAndEvaluate = async (usedSeconds?: number) => {
    stopRecordingAndTranscription();
    setPhase('REPORT');
    setEvaluating(true);

    const actualDuration = usedSeconds ?? Math.max(10, 60 - secondsLeft);
    const finalTranscript =
      transcript.trim() ||
      'No speech detected by browser mic. Ensure microphone access is enabled on Chrome/Safari.';

    try {
      const res = await fetch('/api/ppdt/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: finalTranscript,
          durationSeconds: actualDuration,
          heroPin: pins.find((p) => p.isHero) || pins[0],
          mainAction,
          scenarioTitle: scenario.title,
        }),
      });
      const evalData: EvaluationResult = await res.json();
      setReport(evalData);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      let uploadedAudioUrl = audioUrl;

      if (user && chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const filePath = `${user.id}/${Date.now()}-ppdt-${scenario.id}.webm`;
        const { error: uploadErr } = await supabase.storage
          .from('narration-audio')
          .upload(filePath, blob, { contentType: 'audio/webm' });
        if (!uploadErr) {
          const { data: pub } = supabase.storage
            .from('narration-audio')
            .getPublicUrl(filePath);
          uploadedAudioUrl = pub.publicUrl;
          setAudioUrl(uploadedAudioUrl);
        }
      }

      if (user) {
        await supabase.from('user_attempts').insert({
          user_id: user.id,
          attempt_type: 'PPDT',
          scenario_id: scenario.id,
          scenario_title: scenario.title,
          story_score: evalData.storyScore,
          narration_score: evalData.narrationScore,
          total_score: evalData.totalScore,
          max_score: 60,
          transcript: finalTranscript,
          audio_url: uploadedAudioUrl,
          payload: { pins, mainAction, breakdown: evalData.breakdown },
        });
        setSavedNotice('Voice recording, transcript & AI report saved to your Vault.');
      } else {
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
          transcript: finalTranscript,
          created_at: new Date().toISOString(),
        });
        localStorage.setItem('ssb_arena_guest_vault', JSON.stringify(existing.slice(0, 15)));
        setSavedNotice('Saved locally. Sign in anytime to store audio recordings permanently.');
      }
    } finally {
      setEvaluating(false);
    }
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
    setPins([
      ...pins,
      { id: pins.length + 1, x, y, age: 23, sex: 'M', mood: '+', isHero: false },
    ]);
  };

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
              <PenTool className="w-4 h-4" /> Keep a blank sheet &amp; pen in front of you!
            </p>
            <p>1. <strong>00:30</strong> — Observe hazy black-and-white projector scene.</p>
            <p>2. <strong>01:00</strong> — Mark character positions, age, sex, mood &amp; main action.</p>
            <p>3. <strong>04:00</strong> — Write your story <strong>on paper</strong> (no keyboard typing).</p>
            <p>4. <strong>01:00</strong> — Narrate aloud from your sheet; AI transcribes &amp; grades your voice.</p>
          </div>
          <button
            onClick={() => goToPhase('OBSERVE_30S')}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
          >
            Start 30-Second Projector Screen
          </button>
        </div>
      )}

      {phase === 'OBSERVE_30S' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Phase 1 of 4: Observe Characters, Mood &amp; Background</span>
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
            <h2 className="text-base font-black text-white">Phase 2: Mark Characters in Box</h2>
            <button
              onClick={() => goToPhase('PAPER_WRITE_240S')}
              className="text-xs text-amber-400 underline"
            >
              Next: Write on Paper →
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Tap inside the frame where you saw each character, then set Age / Sex / Mood / Hero:
          </p>

          <div
            onClick={handleBoxClick}
            className="relative w-full h-44 bg-slate-950 border-2 border-dashed border-slate-700 rounded-xl cursor-crosshair overflow-hidden"
          >
            {pins.map((p) => (
              <div
                key={p.id}
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

          <div className="space-y-2">
            {pins.map((pin, index) => (
              <div
                key={pin.id}
                className="flex flex-wrap items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs"
              >
                <span className="font-bold text-slate-400">#{pin.id}</span>
                <input
                  type="number"
                  value={pin.age}
                  onChange={(e) => {
                    const next = [...pins];
                    next[index].age = Number(e.target.value);
                    setPins(next);
                  }}
                  className="w-14 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                />
                <select
                  value={pin.sex}
                  onChange={(e) => {
                    const next = [...pins];
                    next[index].sex = e.target.value as any;
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
                    next[index].mood = e.target.value as any;
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
              </div>
            ))}
          </div>

          <input
            type="text"
            placeholder="Main Action (1 line, e.g., Organizing villagers to desilt flooded canal)"
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
              Phase 3 of 4 • Pen-on-Paper Writing
            </span>
            <button
              onClick={() => goToPhase('NARRATE_60S')}
              className="text-xs text-amber-400 underline"
            >
              Done Writing → Start Narration
            </button>
          </div>

          <div className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 text-center space-y-2">
            <PenTool className="w-8 h-8 text-amber-400 mx-auto" />
            <h2 className="text-xl font-black text-white">Write Your Story on Paper Now</h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Typing is disabled to match real SSB conditions. Write ~100 words neatly on your
              sheet. When the timer hits 00:00, narration starts automatically.
            </p>
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
              <p className="mt-0.5">Introduce Hero &amp; Past Context</p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                secondsLeft <= 180 && secondsLeft > 60
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-bold">03:00 – 01:00</p>
              <p className="mt-0.5">Concrete Leadership Actions</p>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                secondsLeft <= 60
                  ? 'bg-amber-500/15 border-amber-500 text-white'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <p className="font-bold">01:00 – 00:00</p>
              <p className="mt-0.5">Realistic Positive Outcome</p>
            </div>
          </div>
        </div>
      )}

      {phase === 'NARRATE_60S' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-red-400">
              <Mic className="w-4 h-4 animate-pulse" />
              {isRecording ? 'RECORDING & TRANSCRIBING LIVE...' : 'NARRATION TIMER ACTIVE'}
            </span>
            <span className="text-xs text-slate-400">Aim for 95–120 words in 50–60s</span>
          </div>

          <h2 className="text-lg font-black text-white">
            Narrate Your Story Confidently Without Looking Down
          </h2>

          {micError && (
            <p className="text-xs text-amber-300 bg-amber-950/50 border border-amber-800 p-2.5 rounded-lg flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {micError}
            </p>
          )}

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 min-h-[130px]">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 mb-1">
              Live AI Speech-to-Text Transcript
            </p>
            <p className="text-sm text-slate-200 leading-relaxed">
              {transcript || 'Listening to your voice... speak clearly in English...'}
            </p>
          </div>

          <button
            onClick={() => finishNarrationAndEvaluate()}
            className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm"
          >
            Finish Narration &amp; Generate AI OLQ Report
          </button>
        </div>
      )}

      {phase === 'REPORT' && (
        <div className="space-y-5">
          {evaluating ? (
            <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center">
              <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-2" />
              <p className="text-sm font-bold text-white">
                Analyzing Story OLQs &amp; Narration Delivery...
              </p>
            </div>
          ) : (
            report && (
              <>
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-emerald-400 uppercase">
                        AI Screening Assessment
                      </span>
                      <h2 className="text-xl font-black text-white">
                        Total Score: {report.totalScore} / 60
                      </h2>
                    </div>
                    <div className="flex gap-2 text-xs font-bold">
                      <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400">
                        Story OLQs: {report.storyScore}/40
                      </span>
                      <span className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-sky-400">
                        Narration: {report.narrationScore}/20 ({report.wpm} WPM)
                      </span>
                    </div>
                  </div>

                  {savedNotice && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" /> {savedNotice}
                    </p>
                  )}

                  {audioUrl && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                      <p className="text-xs font-bold text-slate-300">
                        Your Recorded 1-Minute Narration (Saved in Vault)
                      </p>
                      <audio controls src={audioUrl} className="w-full h-9" />
                    </div>
                  )}

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <p className="text-xs font-bold text-slate-400">
                      Auto-Transcribed Story ({report.wordCount} words • {report.fillerCount}{' '}
                      fillers)
                    </p>
                    <p className="text-sm text-slate-200 leading-relaxed">{transcript}</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                      <p className="font-bold text-emerald-400">Officer-Like Strengths</p>
                      {report.strengths.map((s, i) => (
                        <p key={i} className="text-slate-300">• {s}</p>
                      ))}
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 space-y-1">
                      <p className="font-bold text-amber-400">Assessor Improvements</p>
                      {report.improvements.map((imp, i) => (
                        <p key={i} className="text-slate-300">• {imp}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
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
                  <p className="text-xs text-slate-400">
                    <strong>Key Visual Cues:</strong> {scenario.key_cues?.join(' • ')}
                  </p>
                </div>
              </>
            )
          )}
        </div>
      )}
    </div>
  );
}
