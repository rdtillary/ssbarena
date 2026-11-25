'use client';

import React, { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SSB_CENTRES } from '@/lib/ssb-centres';

const SSB_COMING = 'My SSB is coming up';
const WHO = [SSB_COMING, 'Aspirant', 'Preparing for exam', 'Curious'];
const ENTRIES = ['NDA', 'CDS', 'AFCAT', 'TES', 'NCC Special Entry', 'Technical Graduate', 'SSC', 'Others'];
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const pretty = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function Calendar({ value, onPick }: { value: string; onPick: (v: string) => void }) {
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());
  const start = value ? new Date(`${value}T00:00:00`) : now;
  const [view, setView] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const offset = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // week starts Monday
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const move = (step: number) => {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const atFirst = view.y === now.getFullYear() && view.m === now.getMonth();

  return (
    <div className="ob-panel ob-in">
      <div className="ob-cal-head">
        <button type="button" className="ob-nav" onClick={() => move(-1)} disabled={atFirst} aria-label="Previous month">‹</button>
        <span>{new Date(view.y, view.m, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</span>
        <button type="button" className="ob-nav" onClick={() => move(1)} aria-label="Next month">›</button>
      </div>
      <div className="ob-grid">
        {WEEKDAYS.map((d) => <span key={d}>{d}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`gap-${i}`} />)}
        {Array.from({ length: days }, (_, i) => {
          const v = iso(view.y, view.m, i + 1);
          return (
            <button
              key={v}
              type="button"
              className={`ob-day${v === value ? ' picked' : ''}`}
              disabled={v < today}
              onClick={() => onPick(v)}
              aria-label={pretty(v)}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  userId: string;
  onDone: () => void;
}

export function OnboardingQuiz({ userId, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [who, setWho] = useState('');
  const [entry, setEntry] = useState('');
  const [ssb, setSsb] = useState('');
  const [date, setDate] = useState('');
  const [open, setOpen] = useState<'ssb' | 'date' | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false); // blocks double clicks while a screen is changing

  const total = who === SSB_COMING || !who ? 3 : 2;

  const save = async (a: { who: string; entry: string; ssb?: string; date?: string }) => {
    setSaving(true);
    setFailed(false);
    const supabase = createClient();
    const { error } = await supabase.from('onboarding_responses').upsert({
      user_id: userId,
      user_type: a.who,
      target_entry: a.entry,
      ssb_centre: a.ssb || null,
      ssb_date: a.date || null,
    });
    if (error) {
      console.error('Could not save quiz answers', error);
      setSaving(false);
      setFailed(true);
      return;
    }
    // Fill the home page's SSB countdown with the same answer.
    if (a.ssb && a.date) {
      await supabase.from('profiles').update({ target_board: a.ssb, reporting_date: a.date }).eq('id', userId);
      try {
        localStorage.setItem('ssb_arena_target', JSON.stringify({ centre: a.ssb, date: a.date }));
      } catch {}
    }
    onDone();
  };

  const after = (fn: () => void) => {
    if (busy.current) return;
    busy.current = true;
    setTimeout(() => {
      busy.current = false;
      fn();
    }, 260); // short beat so the chosen option is seen
  };

  const chooseWho = (v: string) => {
    if (busy.current) return;
    setWho(v);
    after(() => setStep(1));
  };

  const chooseEntry = (v: string) => {
    if (busy.current || saving) return;
    setEntry(v);
    after(() => (who === SSB_COMING ? setStep(2) : save({ who, entry: v })));
  };

  // Question 3 finishes by itself as soon as both answers are in.
  const chooseSchedule = (nextSsb: string, nextDate: string) => {
    setSsb(nextSsb);
    setDate(nextDate);
    if (nextSsb && nextDate) {
      setOpen(null);
      after(() => save({ who, entry, ssb: nextSsb, date: nextDate }));
    } else {
      setOpen(nextSsb ? 'date' : 'ssb');
    }
  };

  const options = (list: string[], chosen: string, onPick: (v: string) => void, two = false) => (
    <div className={`ob-options${two ? ' two' : ''}`}>
      {list.map((v, i) => (
        <button
          key={v}
          type="button"
          disabled={saving}
          className={`ob-option${chosen === v ? ' picked' : ''}`}
          onClick={() => onPick(v)}
        >
          <span className="ob-key">{String.fromCharCode(65 + i)}</span>
          {v}
        </button>
      ))}
    </div>
  );

  const selected = SSB_CENTRES.find((c) => c.code === ssb);

  return (
    <main className="ob">
      <div className="ob-card">
        <div className="ob-progress" aria-hidden>
          {Array.from({ length: total }, (_, i) => <i key={i} className={i <= step ? 'on' : ''} />)}
        </div>

        <div key={step} className="ob-in">
          <p className="ob-eyebrow">Question {step + 1} of {total}</p>

          {step === 0 && (
            <>
              <h1 className="ob-title">What are you?</h1>
              {options(WHO, who, chooseWho)}
            </>
          )}

          {step === 1 && (
            <>
              <h1 className="ob-title">Which entry are you aiming for?</h1>
              {options(ENTRIES, entry, chooseEntry, true)}
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="ob-title">Which SSB are you going to, and when?</h1>
              <div className="ob-field">
                <span className="ob-label">SSB centre</span>
                <button
                  type="button"
                  className={`ob-select${selected ? '' : ' empty'}`}
                  aria-expanded={open === 'ssb'}
                  disabled={saving}
                  onClick={() => setOpen(open === 'ssb' ? null : 'ssb')}
                >
                  {selected ? selected.label : 'Select your SSB'} <b>▼</b>
                </button>
                {open === 'ssb' && (
                  <div className="ob-panel ob-list ob-in">
                    {SSB_CENTRES.map((c) => (
                      <button key={c.code} type="button" className="ob-item" onClick={() => chooseSchedule(c.code, date)}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="ob-field">
                <span className="ob-label">Reporting date</span>
                <button
                  type="button"
                  className={`ob-select${date ? '' : ' empty'}`}
                  aria-expanded={open === 'date'}
                  disabled={saving}
                  onClick={() => setOpen(open === 'date' ? null : 'date')}
                >
                  {date ? pretty(date) : 'Select the date'} <b>▼</b>
                </button>
                {open === 'date' && <Calendar value={date} onPick={(v) => chooseSchedule(ssb, v)} />}
              </div>
            </>
          )}
        </div>

        {saving && <p className="ob-sub" role="status">Opening SSB Arena…</p>}
        {failed && (
          <>
            <p className="ob-error" role="alert">Could not save your answers. Check your internet.</p>
            <button type="button" className="ob-button" onClick={() => save({ who, entry, ssb, date })}>Try again</button>
          </>
        )}
        {step > 0 && !saving && (
          <button
            type="button"
            className="ob-link"
            onClick={() => {
              setFailed(false);
              setOpen(null);
              setStep(step - 1);
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </main>
  );
}
