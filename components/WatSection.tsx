'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Play, PenLine, Timer, Keyboard } from 'lucide-react';
import { WAT_SETS, WAT_SECONDS } from '@/lib/wat-words';

export function WatSection({ isPro, onUnlock }: { isPro: boolean; onUnlock: () => void }) {
  return (
    <section className="space-y-4">
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-950 p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full bg-amber-500/20 blur-3xl" />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-6 right-4 select-none bg-gradient-to-b from-amber-300/40 to-transparent bg-clip-text font-serif text-[110px] font-black leading-none tracking-tighter text-transparent sm:text-[150px]"
        >
          WAT
        </span>
        <div className="relative max-w-xl">
          <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[.25em] text-amber-400">
            Word Association Test
          </span>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            60 words. {WAT_SECONDS} seconds each. Your first thought shows who you are.
          </h2>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-200">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5">
              <Timer className="h-3.5 w-3.5 text-amber-400" /> {WAT_SECONDS}s per word
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5">
              <Keyboard className="h-3.5 w-3.5 text-amber-400" /> Type in the app
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-1.5">
              <PenLine className="h-3.5 w-3.5 text-amber-400" /> or write on paper
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {WAT_SETS.map((s) => {
          const locked = !s.is_free && !isPro;
          const inner = (
            <>
              <div className="flex items-start justify-between">
                <span className="font-serif text-4xl font-semibold leading-none tracking-tight text-white">
                  {String(s.id).padStart(2, '0')}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-black ${
                    s.is_free ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {s.is_free ? 'FREE' : 'PRO'}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-slate-300">Practice Set</p>
              <p className="text-[11px] text-slate-500">{s.words.length} words</p>
              <div
                className={`mt-3 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-black ${
                  locked ? 'bg-slate-800 text-amber-400' : 'bg-amber-500 text-slate-950'
                }`}
              >
                {locked ? (
                  <>
                    <Lock className="h-3.5 w-3.5" /> Unlock
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5 fill-current" /> Start
                  </>
                )}
              </div>
            </>
          );
          const cls =
            'block rounded-2xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:-translate-y-1 hover:border-amber-500/50';
          return locked ? (
            <button key={s.id} type="button" onClick={onUnlock} className={cls}>
              {inner}
            </button>
          ) : (
            <Link key={s.id} href={`/wat/${s.id}`} className={cls}>
              {inner}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
