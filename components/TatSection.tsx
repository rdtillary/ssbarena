'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Play } from 'lucide-react';
import { TAT_PICTURES, TAT_SETS } from '@/lib/tat';

export function TatSection({ isPro, onUnlock }: { isPro: boolean; onUnlock: () => void }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-black text-white">TAT Mocks ({TAT_PICTURES} pictures + 1 blank slide)</h2>
      <div className="grid sm:grid-cols-2 gap-3.5">
        {TAT_SETS.map((set) => {
          const locked = !set.is_free && !isPro;
          return (
            <div key={set.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
              <div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${set.is_free ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'}`}>
                  {set.is_free ? 'FREE' : 'PRO'}
                </span>
                <h3 className="text-sm font-bold text-white mt-1.5">{set.title}</h3>
              </div>
              {locked ? (
                <button type="button" onClick={onUnlock} className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 shrink-0">
                  <Lock className="w-3.5 h-3.5" /> Unlock
                </button>
              ) : (
                <Link href={`/tat/${set.id}`} className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" /> Start
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
