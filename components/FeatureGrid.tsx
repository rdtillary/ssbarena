'use client';

import React from 'react';
import Link from 'next/link';

type Tile = {
  key: string;
  label: string;
  caption: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  badge?: string;
};

const Defs = ({ id }: { id: string }) => (
  <defs>
    <linearGradient id={`${id}-gold`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#FDE68A" />
      <stop offset="0.55" stopColor="#FBBF24" />
      <stop offset="1" stopColor="#B45309" />
    </linearGradient>
    <linearGradient id={`${id}-steel`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#CBD5E1" />
      <stop offset="0.5" stopColor="#64748B" />
      <stop offset="1" stopColor="#1E293B" />
    </linearGradient>
    <linearGradient id={`${id}-slate`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#475569" />
      <stop offset="1" stopColor="#0F172A" />
    </linearGradient>
    <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#BAE6FD" />
      <stop offset="1" stopColor="#0369A1" />
    </linearGradient>
    <radialGradient id={`${id}-glow`} cx=".5" cy=".5" r=".5">
      <stop offset="0" stopColor="#FBBF24" stopOpacity=".35" />
      <stop offset="1" stopColor="#FBBF24" stopOpacity="0" />
    </radialGradient>
  </defs>
);

const IconPpdt = () => (
  <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
    <Defs id="pp" />
    <circle cx="48" cy="50" r="42" fill="url(#pp-glow)" />
    <rect x="10" y="16" width="64" height="58" rx="12" fill="url(#pp-steel)" />
    <rect x="16" y="22" width="52" height="46" rx="8" fill="#E2E8F0" />
    <rect x="16" y="22" width="52" height="46" rx="8" fill="url(#pp-slate)" opacity=".18" />
    <circle cx="34" cy="38" r="7" fill="#94A3B8" />
    <path d="M22 62c0-9 5-14 12-14s12 5 12 14z" fill="#94A3B8" />
    <circle cx="54" cy="42" r="5" fill="#CBD5E1" />
    <path d="M47 62c0-7 3-11 7-11s7 4 7 11z" fill="#CBD5E1" />
    <circle cx="64" cy="30" r="15" fill="#0F172A" fillOpacity=".25" />
    <circle cx="62" cy="28" r="14" fill="rgba(255,255,255,.18)" stroke="url(#pp-gold)" strokeWidth="5" />
    <path d="M72 38l12 12" stroke="url(#pp-gold)" strokeWidth="7" strokeLinecap="round" />
    <path d="M55 22a10 10 0 0 1 8-3" stroke="#fff" strokeOpacity=".7" strokeWidth="2.5" strokeLinecap="round" fill="none" />
  </svg>
);

const IconOir = () => (
  <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
    <Defs id="oi" />
    <circle cx="48" cy="50" r="42" fill="url(#oi-glow)" />
    <path d="M48 12 84 30v38L48 86 12 68V30z" fill="url(#oi-slate)" />
    <path d="M48 12 84 30 48 48 12 30z" fill="url(#oi-steel)" />
    <path d="M12 30 48 48v38L12 68z" fill="url(#oi-sky)" />
    <path d="M84 30 48 48v38l36-18z" fill="url(#oi-gold)" />
    <circle cx="48" cy="30" r="6" fill="#E2E8F0" />
    <circle cx="30" cy="57" r="6" fill="#0C4A6E" fillOpacity=".55" />
    <circle cx="66" cy="57" r="6" fill="#78350F" fillOpacity=".5" />
    <path d="M48 48v38M12 30l36 18 36-18" stroke="#0F172A" strokeOpacity=".5" strokeWidth="2" fill="none" />
  </svg>
);

const IconOlq = () => (
  <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
    <Defs id="ol" />
    <circle cx="48" cy="50" r="42" fill="url(#ol-glow)" />
    {[38, 27, 16].map((r, i) => (
      <polygon
        key={r}
        points={[0, 1, 2, 3, 4, 5]
          .map((k) => `${48 + r * Math.cos((Math.PI / 3) * k - Math.PI / 2)},${50 + r * Math.sin((Math.PI / 3) * k - Math.PI / 2)}`)
          .join(' ')}
        fill={i === 0 ? 'url(#ol-slate)' : 'none'}
        stroke="#64748B"
        strokeOpacity={0.9 - i * 0.2}
        strokeWidth="2"
      />
    ))}
    {[0, 1, 2, 3, 4, 5].map((k) => (
      <line key={k} x1="48" y1="50" x2={48 + 38 * Math.cos((Math.PI / 3) * k - Math.PI / 2)} y2={50 + 38 * Math.sin((Math.PI / 3) * k - Math.PI / 2)} stroke="#475569" strokeWidth="1.5" />
    ))}
    <polygon
      points={[33, 24, 35, 20, 30, 36]
        .map((r, k) => `${48 + r * Math.cos((Math.PI / 3) * k - Math.PI / 2)},${50 + r * Math.sin((Math.PI / 3) * k - Math.PI / 2)}`)
        .join(' ')}
      fill="url(#ol-gold)"
      fillOpacity=".88"
      stroke="#FDE68A"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    {[33, 24, 35, 20, 30, 36].map((r, k) => (
      <circle key={k} cx={48 + r * Math.cos((Math.PI / 3) * k - Math.PI / 2)} cy={50 + r * Math.sin((Math.PI / 3) * k - Math.PI / 2)} r="3.4" fill="#fff" />
    ))}
  </svg>
);

const IconLecturette = () => (
  <svg viewBox="0 0 96 96" className="w-full h-full" aria-hidden>
    <Defs id="le" />
    <circle cx="48" cy="50" r="42" fill="url(#le-glow)" />
    <path d="M24 56h48l-6 28H30z" fill="url(#le-steel)" />
    <rect x="22" y="52" width="52" height="9" rx="4.5" fill="url(#le-gold)" />
    <rect x="45" y="30" width="6" height="24" rx="3" fill="#94A3B8" />
    <rect x="37" y="10" width="22" height="30" rx="11" fill="url(#le-gold)" />
    <path d="M42 18h12M42 24h12M42 30h12" stroke="#78350F" strokeOpacity=".5" strokeWidth="2" strokeLinecap="round" />
    <path d="M26 24a26 26 0 0 0 0 16M70 24a26 26 0 0 1 0 16" stroke="#7DD3FC" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    <path d="M18 18a38 38 0 0 0 0 28M78 18a38 38 0 0 1 0 28" stroke="#38BDF8" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" fill="none" />
  </svg>
);

interface Props {
  onPpdt: () => void;
  onOir: () => void;
}

export function FeatureGrid({ onPpdt, onOir }: Props) {
  const tiles: Tile[] = [
    { key: 'ppdt', label: 'PPDT', caption: 'Picture · Story · Voice', icon: <IconPpdt />, onClick: onPpdt },
    { key: 'oir', label: 'OIR', caption: '10-min speed drills', icon: <IconOir />, onClick: onOir },
    { key: 'olq', label: 'OLQ Analysis', caption: 'Report on 15 OLQs', icon: <IconOlq />, href: '/olq' },
    { key: 'lect', label: 'Lecturette', caption: 'Spin a topic · 3 min', icon: <IconLecturette />, href: '/lecturette' },
  ];

  return (
    <section aria-label="Features" className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
      {tiles.map((t) => {
        const inner = (
          <>
            {t.badge && (
              <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[9px] font-black tracking-widest">
                {t.badge}
              </span>
            )}
            <div className="feature-icon w-[84px] h-[84px] sm:w-24 sm:h-24">{t.icon}</div>
            <span className="mt-2 text-[15px] sm:text-base font-black text-white tracking-tight">{t.label}</span>
            <span className="text-[10.5px] text-slate-400 font-medium mt-0.5">{t.caption}</span>
          </>
        );
        const cls = 'feature-tile group relative flex flex-col items-center text-center pt-5 pb-4 px-2';
        return t.href ? (
          <Link key={t.key} href={t.href} className={cls}>
            {inner}
          </Link>
        ) : (
          <button key={t.key} type="button" onClick={t.onClick} className={cls}>
            {inner}
          </button>
        );
      })}
    </section>
  );
}
