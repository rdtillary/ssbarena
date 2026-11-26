'use client';

import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { SSB_CENTRES } from '@/lib/ssb-centres';
import { Logo } from '@/components/Logo';
import { GATE_CSS } from '@/components/gate-styles';

type Step = 'role' | 'exam' | 'ssb';

const ROLES = [
  { v: 'ssb_upcoming', t: 'My SSB is coming up', s: 'I have a call letter or a reporting date' },
  { v: 'aspirant', t: 'Aspirant', s: 'Aiming for the uniform' },
  { v: 'preparing', t: 'Preparing for the exam', s: 'Written exam or SSB preparation in progress' },
  { v: 'curious', t: 'Just curious', s: 'Exploring what the SSB is all about' },
];

const EXAMS = ['NDA', 'CDS', 'AFCAT', 'TES', 'NCC Special Entry', 'Technical Graduate', 'SSC', 'Other'];

export function OnboardingQuiz({ userId, onDone }: { userId: string; onDone: () => void }) {
  const supabase = createClient();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState('');
  const [exam, setExam] = useState('');
  const [picked, setPicked] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [centre, setCentre] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const idx = step === 'role' ? 0 : step === 'exam' ? 1 : 2;
  const total = role && role !== 'ssb_upcoming' ? 2 : 3;

  const finish = async (examValue: string, centreValue: string, dateValue: string) => {
    setSaving(true);
    try {
      await supabase.from('onboarding_answers').upsert(
        {
          user_id: userId,
          role,
          exam: examValue,
          ssb_centre: centreValue || null,
          reporting_date: dateValue || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
      if (centreValue && dateValue) {
        await supabase
          .from('profiles')
          .update({ target_board: centreValue, reporting_date: dateValue })
          .eq('id', userId);
        try {
          localStorage.setItem('ssb_arena_target', JSON.stringify({ centre: centreValue, date: dateValue }));
        } catch {}
      }
    } catch {}
    try {
      localStorage.setItem(`ssb_onb_${userId}`, '1');
    } catch {}
    onDone();
  };

  // Highlights the tapped option, then moves on by itself. No "Next" button.
  const advance = (value: string, next: () => void) => {
    if (picked) return;
    setPicked(value);
    setTimeout(() => {
      setLeaving(true);
      setTimeout(() => {
        next();
        setLeaving(false);
        setPicked('');
      }, 240);
    }, 300);
  };

  const pickRole = (v: string) =>
    advance(v, () => {
      setRole(v);
      setStep('exam');
    });

  const pickExam = (v: string) =>
    advance(v, () => {
      setExam(v);
      if (role === 'ssb_upcoming') setStep('ssb');
      else finish(v, '', '');
    });

  const back = () => {
    setPicked('');
    setStep(step === 'ssb' ? 'exam' : 'role');
  };

  const minDate = new Date().toLocaleDateString('en-CA');

  return (
    <div className="gt-root">
      <style>{GATE_CSS}</style>
      <div className="gt-grain" />
      <div className="gt-orb" style={{ width: 380, height: 380, left: '-10%', top: '4%', background: '#f59e0b' }} />
      <div className="gt-orb" style={{ width: 340, height: 340, right: '-8%', bottom: '2%', background: '#6366f1', animationDelay: '-7s' }} />

      <div className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 py-7">
        <div className="flex items-center justify-between">
          <Logo compact />
          <span className="font-mono text-xs font-bold tracking-widest text-slate-400">
            0{idx + 1} <span className="text-slate-600">/ 0{total}</span>
          </span>
        </div>

        <div className="mt-5 flex gap-2">
          {Array.from({ length: total }).map((_, i) => (
            <div key={i} className={`gt-bar ${i <= idx ? 'on' : ''}`}>
              <i />
            </div>
          ))}
        </div>

        <div key={step} className={`flex flex-1 flex-col justify-center py-8 ${leaving ? 'gt-leave' : ''}`}>
          {step !== 'role' && (
            <button
              type="button"
              onClick={back}
              className="gt-in mb-5 flex items-center gap-1.5 self-start text-xs font-bold text-slate-500 hover:text-amber-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}

          {step === 'role' && (
            <>
              <p className="gt-eyebrow gt-in">Let&apos;s get to know you</p>
              <h1 className="gt-serif gt-in mt-3 text-[40px] leading-[1.05] text-white sm:text-[56px]" style={{ animationDelay: '60ms' }}>
                What are you?
              </h1>
              <div className="mt-8 space-y-3">
                {ROLES.map((o, i) => (
                  <button
                    key={o.v}
                    type="button"
                    disabled={!!picked}
                    onClick={() => pickRole(o.v)}
                    className={`gt-opt ${picked === o.v ? 'gt-picked' : picked ? 'gt-dim' : ''}`}
                    style={{ animationDelay: `${140 + i * 70}ms` }}
                  >
                    <span className="gt-badge">{String.fromCharCode(65 + i)}</span>
                    <span>
                      <span className="gt-t">{o.t}</span>
                      <span className="gt-sub">{o.s}</span>
                    </span>
                    <span className="gt-arrow">→</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'exam' && (
            <>
              <p className="gt-eyebrow gt-in">Your entry</p>
              <h1 className="gt-serif gt-in mt-3 text-[38px] leading-[1.05] text-white sm:text-[52px]" style={{ animationDelay: '60ms' }}>
                Which exam are you aiming for?
              </h1>
              <div className="mt-8 grid grid-cols-2 gap-3">
                {EXAMS.map((o, i) => (
                  <button
                    key={o}
                    type="button"
                    disabled={!!picked}
                    onClick={() => pickExam(o)}
                    className={`gt-opt gt-chip ${picked === o ? 'gt-picked' : picked ? 'gt-dim' : ''}`}
                    style={{ animationDelay: `${140 + i * 55}ms` }}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'ssb' && (
            <>
              <p className="gt-eyebrow gt-in">Almost there</p>
              <h1 className="gt-serif gt-in mt-3 text-[38px] leading-[1.05] text-white sm:text-[52px]" style={{ animationDelay: '60ms' }}>
                Which SSB are you going to, and when?
              </h1>
              <div className="gt-in gt-glass mt-8 space-y-5 rounded-[24px] p-6" style={{ animationDelay: '160ms' }}>
                <div>
                  <label className="gt-label" htmlFor="q-ssb">SSB centre</label>
                  <select id="q-ssb" className="gt-input" value={centre} onChange={(e) => setCentre(e.target.value)}>
                    <option value="">Select your SSB centre…</option>
                    {SSB_CENTRES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="gt-label" htmlFor="q-date">Reporting date</label>
                  <input
                    id="q-date"
                    type="date"
                    className="gt-input"
                    min={minDate}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="gt-btn"
                  disabled={!centre || !date || saving}
                  onClick={() => finish(exam, centre, date)}
                >
                  {saving ? 'Setting up your arena…' : 'Enter SSB Arena →'}
                </button>
              </div>
            </>
          )}
        </div>

        {saving && step !== 'ssb' && (
          <p className="pb-4 text-center text-xs font-bold tracking-widest text-amber-400">SETTING UP YOUR ARENA…</p>
        )}
      </div>
    </div>
  );
}
