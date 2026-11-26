'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Sparkles, Eye, Pencil, Mic, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';

const STEPS = [
  { icon: Eye, title: 'View the picture', text: '30 seconds on the hazy projector slide.' },
  { icon: Pencil, title: 'Write your story', text: '4 minutes on real paper, no typing.' },
  { icon: Mic, title: 'Narrate it', text: '1-minute voice narration, transcribed by AI.' },
  { icon: BarChart3, title: 'Get your OLQ report', text: 'Scored on all 15 Officer Like Qualities.' },
];

export default function OlqIntroPage() {
  const [supabase] = useState(() => createClient());
  const [latestId, setLatestId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data } = await supabase
        .from('user_attempts')
        .select('id, transcript')
        .eq('user_id', auth.user.id)
        .eq('attempt_type', 'PPDT')
        .order('created_at', { ascending: false })
        .limit(10);
      const hit = (data || []).find((r: any) => r.id && r.transcript);
      if (hit) setLatestId(hit.id);
    })();
  }, [supabase]);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-[#090D16]/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" aria-label="Back to home" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm font-bold">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <Logo compact />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8 space-y-8">
        <section className="relative isolate overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-7 sm:p-10 text-center">
          <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(600px_300px_at_50%_-10%,rgba(245,158,11,0.18),transparent_70%)]" />
          <span className="inline-block px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[11px] font-black tracking-widest">
            OLQ ANALYSIS
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-black text-white leading-tight">
            Attempt a PPDT first.
          </h1>
          <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-xl mx-auto">
            Your OLQ analysis is built from your own PPDT story and voice narration. Complete your first PPDT and the AI
            will score you on all 15 Officer Like Qualities.
          </p>

          <Link
            href="/ppdt/1"
            className="mt-7 inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 text-slate-950 font-black text-base shadow-[0_14px_30px_-10px_rgba(245,158,11,0.6)]"
          >
            <Play className="w-5 h-5 fill-current" /> Start PPDT #01
          </Link>

          {latestId && (
            <div className="mt-4">
              <Link href={`/report/${latestId}`} className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-400 hover:underline">
                <Sparkles className="w-4 h-4" /> Or open your latest OLQ report
              </Link>
            </div>
          )}
        </section>

        <section className="grid sm:grid-cols-2 gap-3.5">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <div className="shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-amber-300/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-400 tracking-widest">STEP {i + 1}</p>
                  <p className="text-sm font-black text-white mt-0.5">{s.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.text}</p>
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
