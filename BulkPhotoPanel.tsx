'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ImagePlus, CheckCircle2, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Row {
  id: number;
  title: string;
  image_url?: string | null;
}

const firstNumber = (s: string): number | null => {
  const m = s.match(/(\d+)/);
  return m ? Number(m[1]) : null;
};

export function BulkPhotoPanel({ onDone }: { onDone?: () => void }) {
  const supabase = createClient();
  const [scenarios, setScenarios] = useState<Row[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [offset, setOffset] = useState(0);
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<{ ok: boolean; text: string }[]>([]);

  const load = async () => {
    const { data } = await supabase
      .from('ppdt_scenarios')
      .select('id, title, image_url')
      .order('id', { ascending: true });
    if (data) setScenarios(data as Row[]);
  };
  useEffect(() => {
    load();
  }, []);

  // file "PPDT-3.webp" + offset 25 -> scenario whose title's first number is 28
  const matches = useMemo(() => {
    return files.map((file) => {
      const n = firstNumber(file.name);
      const target = n === null ? null : n + offset;
      const sc = target === null ? undefined : scenarios.find((s) => firstNumber(s.title) === target);
      const skip = !!sc && onlyMissing && !!sc.image_url;
      return { file, sc, skip };
    });
  }, [files, scenarios, offset, onlyMissing]);

  const upload = async () => {
    setBusy(true);
    setLog([]);
    let done = 0;
    for (const m of matches) {
      if (!m.sc) {
        setLog((l) => [...l, { ok: false, text: `${m.file.name}: no matching scenario` }]);
        continue;
      }
      if (m.skip) {
        setLog((l) => [...l, { ok: true, text: `${m.sc!.title}: already has a photo, skipped` }]);
        continue;
      }
      try {
        const fd = new FormData();
        fd.append('bucket', 'ppdt-scenes');
        fd.append('file', m.file);
        const up = await fetch('/api/admin/upload', { method: 'POST', body: fd });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upData.error || 'Upload failed');

        const patch = await fetch('/api/admin/scenarios', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: m.sc.id, image_url: upData.url }),
        });
        if (!patch.ok) throw new Error('Could not save the photo link');
        done++;
        setLog((l) => [...l, { ok: true, text: `${m.sc!.title}: photo added` }]);
      } catch (e: any) {
        setLog((l) => [...l, { ok: false, text: `${m.file.name}: ${e?.message || 'failed'}` }]);
      }
    }
    setBusy(false);
    if (done > 0) {
      await load();
      onDone?.();
    }
  };

  const ready = matches.filter((m) => m.sc && !m.skip).length;

  return (
    <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3.5">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        <ImagePlus className="w-4 h-4 text-amber-400" /> Bulk Add PPDT Photos
      </h2>
      <p className="text-xs text-slate-400">
        Select many images at once. A file is matched to the scenario whose title has the same number
        (e.g. <code>PPDT-3.webp</code> + offset 25 → &quot;Sample Story : 28&quot;).
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <label className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 cursor-pointer">
          Choose photos
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) =>
              setFiles(
                Array.from(e.target.files || []).sort(
                  (a, b) => (firstNumber(a.name) ?? 0) - (firstNumber(b.name) ?? 0)
                )
              )
            }
          />
        </label>
        <label className="text-xs text-slate-300 flex items-center gap-2">
          Number offset
          <input
            type="number"
            value={offset}
            onChange={(e) => setOffset(Number(e.target.value) || 0)}
            className="w-20 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
          />
        </label>
        <label className="text-xs text-slate-300 flex items-center gap-2">
          <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} />
          Skip scenarios that already have a photo
        </label>
      </div>

      {matches.length > 0 && (
        <div className="max-h-56 overflow-auto rounded-xl bg-slate-950 border border-slate-800 p-2.5 space-y-1 text-xs">
          {matches.map((m, i) => (
            <p key={i} className={m.sc ? (m.skip ? 'text-slate-500' : 'text-slate-200') : 'text-red-400'}>
              {m.file.name} → {m.sc ? m.sc.title : 'no match (check the offset)'}
              {m.skip ? ' (has photo)' : ''}
            </p>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={busy || ready === 0}
        onClick={upload}
        className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black disabled:opacity-40"
      >
        {busy ? 'Uploading...' : `Upload ${ready} photo${ready === 1 ? '' : 's'}`}
      </button>

      {log.length > 0 && (
        <div className="max-h-40 overflow-auto space-y-0.5 text-xs">
          {log.map((l, i) => (
            <p key={i} className={`flex items-start gap-1.5 ${l.ok ? 'text-emerald-400' : 'text-red-400'}`}>
              {l.ok ? (
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              )}
              {l.text}
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
