'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import {
  CATEGORY_COLORS,
  LECTURETTE_CATEGORIES,
  LECTURETTE_TOPICS,
  type LecturetteTopic,
} from '@/lib/lecturette-topics';

interface Props {
  label: string;
  locked?: boolean;
  onSpun: (topic: LecturetteTopic) => void;
  onLockedClick?: () => void;
}

const N = LECTURETTE_TOPICS.length;
const STEP = 360 / N;
const C = 200;
const R = 188;
const SPIN_MS = 5400;

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};

export function SpinWheel({ label, locked, onSpun, onLockedClick }: Props) {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [ticker, setTicker] = useState('');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const wedges = useMemo(
    () =>
      LECTURETTE_TOPICS.map((t, i) => {
        const [x0, y0] = pt(i * STEP, R);
        const [x1, y1] = pt((i + 1) * STEP, R);
        const color = CATEGORY_COLORS[LECTURETTE_CATEGORIES.indexOf(t.category)] || '#475569';
        return { id: t.id, d: `M${C} ${C}L${x0} ${y0}A${R} ${R} 0 0 1 ${x1} ${y1}Z`, color, odd: i % 2 };
      }),
    []
  );

  const spin = () => {
    if (spinning) return;
    if (locked) return onLockedClick?.();
    const idx = Math.floor(Math.random() * N);
    const center = (idx + 0.5) * STEP;
    const jitter = (Math.random() - 0.5) * STEP * 0.6;
    const next = Math.ceil(rotation / 360) * 360 + 360 * 6 - center + jitter;
    setSpinning(true);
    setRotation(next);

    // Flicker through topic names while the wheel slows down.
    let delay = 55;
    const flick = () => {
      setTicker(LECTURETTE_TOPICS[Math.floor(Math.random() * N)].title);
      delay *= 1.07;
      if (delay < 420) timers.current.push(setTimeout(flick, delay));
    };
    flick();

    timers.current.push(
      setTimeout(() => {
        setSpinning(false);
        setTicker('');
        onSpun(LECTURETTE_TOPICS[idx]);
      }, SPIN_MS + 150)
    );
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[380px] aspect-square select-none">
        {/* glow */}
        <div className="absolute inset-[-6%] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* pointer */}
        <div className="absolute left-1/2 -top-1.5 z-20 -translate-x-1/2 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
          <svg width="30" height="38" viewBox="0 0 30 38">
            <path d="M15 38 L2 8 Q15 -4 28 8 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
            <circle cx="15" cy="12" r="3.5" fill="#78350f" />
          </svg>
        </div>

        <svg viewBox="0 0 400 400" className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="rim" cx="50%" cy="50%" r="50%">
              <stop offset="92%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#b45309" />
            </radialGradient>
            <radialGradient id="shade" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </radialGradient>
          </defs>
          <circle cx={C} cy={C} r={197} fill="url(#rim)" />
          <circle cx={C} cy={C} r={192} fill="#090d16" />
          <g
            style={{
              transformOrigin: '200px 200px',
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${SPIN_MS}ms cubic-bezier(0.12, 0.72, 0.08, 1)` : 'none',
            }}
          >
            {wedges.map((w) => (
              <path
                key={w.id}
                d={w.d}
                fill={w.color}
                fillOpacity={w.odd ? 0.78 : 1}
                stroke="#090d16"
                strokeWidth={0.6}
              />
            ))}
          </g>
          <circle cx={C} cy={C} r={R} fill="url(#shade)" pointerEvents="none" />
          <circle cx={C} cy={C} r={R} fill="none" stroke="rgba(251,191,36,0.55)" strokeWidth={1.5} />
          <circle cx={C} cy={C} r={72} fill="#090d16" stroke="#fbbf24" strokeWidth={3} />
          <circle cx={C} cy={C} r={65} fill="none" stroke="rgba(251,191,36,0.25)" strokeWidth={1} />
        </svg>

        {/* hub button */}
        <button
          type="button"
          onClick={spin}
          disabled={spinning}
          aria-label={label}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[34%] aspect-square rounded-full flex flex-col items-center justify-center gap-1 px-2 text-center text-amber-400 font-black leading-tight hover:text-amber-300 disabled:cursor-default"
        >
          {locked ? <Lock className="w-5 h-5" /> : null}
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wider">{spinning ? 'Spinning…' : label}</span>
        </button>
      </div>

      <div className="h-6 text-center text-xs font-bold text-slate-400 truncate max-w-full px-4" aria-live="off">
        {spinning ? ticker : ''}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 max-w-sm">
        {LECTURETTE_CATEGORIES.map((c, i) => (
          <span key={c} className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <i className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[i] }} />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}
