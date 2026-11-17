'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2, Share2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DEFAULT_OIR_SETS } from '@/lib/seed-data';
import { OIRSet } from '@/lib/types';

// Figure questions carry an image (the cropped question from the source paper).
function QuestionImage({ src }: { src?: string | null }) {
  if (!src) return null;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <img
        src={src}
        alt="Question figure"
        className="w-full max-w-xl mx-auto rounded-lg bg-white border border-slate-700"
      />
    </a>
  );
}

export default function OIRDrillPage() {
  const params = useParams();
  const idParam = String(params.id || 'default');
  const supabase = createClient();

  const [oirSet, setOirSet] = useState<OIRSet | null>(null);
  const [loadError, setLoadError] = useState('');

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [questionTimers, setQuestionTimers] = useState<Record<number, number>>({});
  const [totalSecondsLeft, setTotalSecondsLeft] = useState(600);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      if (/^\d+$/.test(idParam)) {
        const { data } = await supabase
          .from('oir_sets')
          .select('*, oir_questions(*)')
          .eq('id', Number(idParam))
          .maybeSingle();
        const qs = (data as any)?.oir_questions as any[] | undefined;
        if (data && qs && qs.length) {
          const questions = [...qs].sort((a, b) => a.question_number - b.question_number);
          setTotalSecondsLeft(data.duration_seconds || 600);
          setOirSet({
            id: data.id,
            title: data.title,
            is_free: data.is_free,
            duration_seconds: data.duration_seconds || 600,
            questions,
          });
          return;
        }
      }
      if (idParam === 'default' || idParam === '1') {
        const def = DEFAULT_OIR_SETS[0];
        setTotalSecondsLeft(def.duration_seconds);
        setOirSet(def);
        return;
      }
      setLoadError('This drill could not be found.');
    })();
  }, [idParam]);

  useEffect(() => {
    if (!oirSet || submitted) return;
    const interval = setInterval(() => {
      setTotalSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      setQuestionTimers((prev) => ({
        ...prev,
        [currentIdx]: (prev[currentIdx] || 0) + 1,
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [oirSet, currentIdx, submitted]);

  useEffect(() => {
    if (oirSet && !submitted && totalSecondsLeft === 0) setSubmitted(true);
  }, [totalSecondsLeft, oirSet, submitted]);

  if (loadError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-sm font-bold text-red-400">{loadError}</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold">
          Back to Home
        </Link>
      </div>
    );
  }

  if (!oirSet) {
    return <div className="p-8 text-center text-slate-400 text-sm">Loading drill...</div>;
  }

  const questions = oirSet.questions;
  const currentQ = questions[currentIdx];
  const qSeconds = questionTimers[currentIdx] || 0;
  const imgOf = (q: any): string | null => q?.image_url || null;

  const score = questions.reduce(
    (acc, q, idx) => (answers[idx] === q.correct_index ? acc + 1 : acc),
    0
  );

  const shareOnWhatsApp = () => {
    const timeUsed = oirSet.duration_seconds - totalSecondsLeft;
    const mins = Math.floor(timeUsed / 60);
    const secs = timeUsed % 60;
    const text = encodeURIComponent(
      `🎯 SSB Arena OIR Drill Score: ${score}/${questions.length} in ${mins}m ${secs}s!\nCan you beat my Stage-1 OIR speed? Practice free: ${window.location.origin}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-xl">
        <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Exit
        </Link>
        <span className="text-xs font-bold text-white truncate">{oirSet.title}</span>
        <span className="font-mono font-black text-sm text-amber-400">
          {String(Math.floor(totalSecondsLeft / 60)).padStart(2, '0')}:
          {String(totalSecondsLeft % 60).padStart(2, '0')}
        </span>
      </div>

      {!submitted ? (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">
              Question {currentIdx + 1} of {questions.length} • {currentQ.category}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                qSeconds >= 45
                  ? 'bg-red-600/20 text-red-400'
                  : qSeconds >= 26
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {qSeconds >= 45 ? `⚠ Time Trap (${qSeconds}s)` : `Time on Q: ${qSeconds}s`}
            </span>
          </div>

          {imgOf(currentQ) ? (
            <QuestionImage src={imgOf(currentQ)} />
          ) : (
            <p className="text-base font-bold text-white leading-relaxed">{currentQ.question_text}</p>
          )}

          <div className="space-y-2.5">
            {currentQ.options.map((opt, idx) => {
              const selected = answers[currentIdx] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => setAnswers({ ...answers, [currentIdx]: idx })}
                  className={`w-full text-left p-3.5 rounded-xl border text-sm font-medium transition ${
                    selected
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="font-black text-amber-400 mr-2">
                    {String.fromCharCode(65 + idx)}.
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-bold text-white disabled:opacity-40"
            >
              ← Previous
            </button>
            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIdx((i) => i + 1)}
                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-black"
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={() => setSubmitted(true)}
                className="px-5 py-2 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black"
              >
                Submit OIR Test
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase">OIR Screening Result</p>
              <h2 className="text-2xl font-black text-white">
                Score: {score} / {questions.length}
              </h2>
            </div>
            <button
              onClick={shareOnWhatsApp}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5"
            >
              <Share2 className="w-4 h-4" /> Challenge Group on WhatsApp
            </button>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const userAns = answers[idx];
              const correct = userAns === q.correct_index;
              const spent = questionTimers[idx] || 0;
              return (
                <div key={q.id ?? idx} className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-white">
                      Q{q.question_number}. {imgOf(q) ? q.category : q.question_text}
                    </span>
                    <span className={spent >= 45 ? 'text-red-400 font-bold' : 'text-slate-400'}>
                      {spent}s
                    </span>
                  </div>
                  {imgOf(q) && <QuestionImage src={imgOf(q)} />}
                  <p className={correct ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                    {correct ? (
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Correct ({q.options[q.correct_index]})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Your answer:{' '}
                        {userAns !== undefined ? q.options[userAns] : 'Skipped'} • Answer:{' '}
                        {q.options[q.correct_index]}
                      </span>
                    )}
                  </p>
                  {q.explanation && <p className="text-slate-400">{q.explanation}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
