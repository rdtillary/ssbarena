'use client';

import React, { useEffect, useState } from 'react';
import { Pencil, Shield } from 'lucide-react';
import { SSB_CENTRES, getCentre } from '@/lib/ssb-centres';

interface Props {
  centreCode: string;
  reportingDate: string; // YYYY-MM-DD
  imageUrl?: string | null;
  onSave: (centreCode: string, reportingDate: string) => void;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function ReportingTimer({ centreCode, reportingDate, imageUrl, onSave }: Props) {
  const [now, setNow] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftCentre, setDraftCentre] = useState(centreCode);
  const [draftDate, setDraftDate] = useState(reportingDate);

  // `now` starts null so server and client render the same markup (no hydration mismatch).
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const centre = getCentre(centreCode);
  const target = reportingDate ? new Date(`${reportingDate}T00:00:00`).getTime() : NaN;
  const isSet = Boolean(centre) && !Number.isNaN(target);

  let units: [string, string][] = [
    ['DAYS', '--'],
    ['HRS', '--'],
    ['MIN', '--'],
    ['SEC', '--'],
  ];
  if (isSet && now !== null) {
    const total = Math.max(0, Math.floor((target - now) / 1000));
    units = [
      ['DAYS', pad(Math.floor(total / 86400))],
      ['HRS', pad(Math.floor((total % 86400) / 3600))],
      ['MIN', pad(Math.floor((total % 3600) / 60))],
      ['SEC', pad(total % 60)],
    ];
  }

  const openEditor = () => {
    setDraftCentre(centreCode);
    setDraftDate(reportingDate);
    setEditing(true);
  };

  const save = () => {
    if (!draftCentre || !draftDate) return;
    onSave(draftCentre, draftDate);
    setEditing(false);
  };

  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="h-16 sm:h-[72px] flex items-stretch">
        <div
          className={`basis-[56%] shrink-0 flex items-center px-3 sm:px-4 ${
            isSet ? '' : 'opacity-40'
          }`}
          aria-live="off"
        >
          <div className="flex items-start gap-1 sm:gap-1.5 font-mono font-black tabular-nums text-amber-400">
            {units.map(([label, value], i) => (
              <React.Fragment key={label}>
                {i > 0 && (
                  <span className="text-slate-600 text-[26px] sm:text-4xl leading-none">:</span>
                )}
                <div className="flex flex-col items-center">
                  <span className="text-[26px] sm:text-4xl leading-none">{value}</span>
                  <span className="font-sans font-semibold text-[8px] tracking-widest text-slate-500 mt-1">
                    {label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-1 min-w-0 flex items-center justify-end gap-2.5 pl-2">
          <div className="min-w-0 text-right leading-tight">
            <p className="text-[9px] uppercase tracking-wide text-slate-300 truncate">
              {centre ? centre.short : 'Select your SSB centre'}
            </p>
            {centre && <p className="text-[9px] text-slate-500 truncate">{centre.city}</p>}
            <button
              type="button"
              onClick={editing ? () => setEditing(false) : openEditor}
              className="mt-0.5 inline-flex items-center gap-1 text-[9px] font-bold text-amber-400 hover:underline"
            >
              <Pencil className="w-2.5 h-2.5" /> {isSet ? 'Edit' : 'Set up'}
            </button>
          </div>
          <div className="h-full w-16 sm:w-28 shrink-0 bg-slate-800">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={centre ? `${centre.short} gate` : 'SSB centre'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <Shield className="w-6 h-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="border-t border-slate-800 p-3 flex flex-col sm:flex-row gap-2.5 sm:items-center">
          <select
            value={draftCentre}
            onChange={(e) => setDraftCentre(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
          >
            <option value="">Select your SSB centre…</option>
            {SSB_CENTRES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={draftDate}
            min={new Date().toLocaleDateString('en-CA')}
            onChange={(e) => setDraftDate(e.target.value)}
            aria-label="Reporting date"
            className="px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white [color-scheme:dark]"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={!draftCentre || !draftDate}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
