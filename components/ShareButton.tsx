'use client';

import React from 'react';
import { Share2 } from 'lucide-react';

export function ShareButton() {
  const share = async () => {
    const url = window.location.origin;
    const text = 'Practice the real SSB with PPDT, OIR and Lecturette under exam timers, plus OLQ analysis, on SSB Arena.';
    if (navigator.share) {
      try {
        await navigator.share({ title: 'SSB Arena', text, url });
      } catch {}
      return;
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
  };

  return (
    <button
      type="button"
      onClick={share}
      className="w-full py-3 rounded-xl bg-slate-900 border border-emerald-500/40 hover:border-emerald-500 text-emerald-400 font-black text-sm flex items-center justify-center gap-2"
    >
      <Share2 className="w-4 h-4" /> Share SSB Arena with Friends
    </button>
  );
}
