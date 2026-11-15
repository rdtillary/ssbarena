import React from 'react';

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2.5 select-none">
      <svg
        width={compact ? 36 : 44}
        height={compact ? 28 : 34}
        viewBox="0 0 88 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="SSB Arena +14 Chest Bib"
      >
        <path d="M12 10L2 2" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <path d="M76 10L86 2" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <path d="M12 58L2 66" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <path d="M76 58L86 66" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <rect x="8" y="6" width="72" height="56" rx="5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="14" cy="12" r="2.2" fill="#334155" />
        <circle cx="74" cy="12" r="2.2" fill="#334155" />
        <circle cx="14" cy="56" r="2.2" fill="#334155" />
        <circle cx="74" cy="56" r="2.2" fill="#334155" />
        <rect x="24" y="22" width="6" height="24" rx="1.5" fill="#DC2626" />
        <rect x="15" y="31" width="24" height="6" rx="1.5" fill="#DC2626" />
        <text
          x="43"
          y="46"
          fill="#0F172A"
          fontFamily="monospace, sans-serif"
          fontWeight="900"
          fontSize="30"
          letterSpacing="-1"
        >
          14
        </text>
      </svg>
      <div className="leading-none">
        <span className="font-black tracking-wider text-amber-400 text-base sm:text-lg">
          SSB <span className="text-slate-100">ARENA</span>
        </span>
        {!compact && (
          <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-0.5">
            Stage-1 Screening Lab
          </p>
        )}
      </div>
    </div>
  );
}
