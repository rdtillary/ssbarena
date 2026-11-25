'use client';

import { useState } from 'react';
import { compressImage } from '@/lib/compress-image';

const kb = (n: number) => `${Math.round(n / 1024)} KB`;

async function json(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export default function OptimizePage() {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const run = async () => {
    setBusy(true);
    setLog([]);
    const say = (line: string) => setLog((l) => [...l, line]);
    let before = 0;
    let after = 0;
    try {
      const { items } = await json(await fetch('/api/admin/optimize'));
      say(`Checking ${items.length} pictures. Keep this page open.`);
      for (const [i, item] of items.entries()) {
        const label = `${i + 1}/${items.length} ${item.table} ${item.id}`;
        try {
          const res = await fetch(item.url);
          if (!res.ok) throw new Error(`Download failed (${res.status})`);
          const old = await res.blob();
          // Already small: leave it alone, so running this twice is harmless.
          if (old.size <= 300 * 1024) {
            say(`${label}: already small (${kb(old.size)})`);
            continue;
          }
          const small = await compressImage(old, item.bucket);
          if (small.size >= old.size) {
            say(`${label}: could not shrink (${kb(old.size)})`);
            continue;
          }
          const form = new FormData();
          form.append('bucket', item.bucket);
          form.append('file', small);
          const { url } = await json(await fetch('/api/admin/upload', { method: 'POST', body: form }));
          await json(
            await fetch('/api/admin/optimize', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ table: item.table, id: item.id, url }),
            })
          );
          before += old.size;
          after += small.size;
          say(`${label}: ${kb(old.size)} → ${kb(small.size)}`);
        } catch (e: any) {
          say(`${label}: FAILED, ${e?.message || 'unknown error'}`);
        }
      }
      say(before ? `Done. Shrunk ${kb(before)} to ${kb(after)}.` : 'Done. Nothing was changed.');
    } catch (e: any) {
      say(`Stopped: ${e?.message || 'unknown error'}`);
    }
    setBusy(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-xl font-black text-white">Shrink pictures</h1>
      <p className="text-sm text-slate-300">
        Compresses every large PPDT, candidate and SSB centre picture and switches the site to the smaller copy.
        Your original files are kept in Supabase.
      </p>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-black disabled:opacity-50"
      >
        {busy ? 'Working…' : 'Shrink all pictures'}
      </button>
      <ul className="space-y-1 text-xs text-slate-300 font-mono">
        {log.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ul>
    </div>
  );
}
