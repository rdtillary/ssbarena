'use client';

import React from 'react';
import Link from 'next/link';
import { SRT_SETS } from '@/lib/srt';
import { SRT_CSS } from '@/components/srt-styles';

export function SrtSection({ isPro, onUnlock }: { isPro: boolean; onUnlock: () => void }) {
  return (
    <section className="sr">
      <style>{SRT_CSS}</style>
      <p className="sr-eyebrow">Situation Reaction Test</p>
      <h2 className="sr-h1">
        60 situations. <em>30 minutes.</em>
      </h2>
      <p className="sr-lead">Type your reactions, or write them on paper like the real test.</p>
      <div className="sr-modes">
        {SRT_SETS.map((set) => {
          const locked = !set.is_free && !isPro;
          const inner = (
            <>
              <span className="sr-eyebrow">{set.is_free ? 'Free' : 'Pro'}</span>
              <h3>{set.title}</h3>
              <p>{set.situations.length} situations · 30 minutes</p>
              <span className="go">{locked ? 'Unlock →' : 'Open booklet →'}</span>
            </>
          );
          return locked ? (
            <button key={set.id} type="button" className="sr-mode" onClick={onUnlock}>{inner}</button>
          ) : (
            <Link key={set.id} href={`/srt/${set.id}`} className="sr-mode block">{inner}</Link>
          );
        })}
      </div>
    </section>
  );
}
