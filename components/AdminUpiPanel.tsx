'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { BadgeIndianRupee } from 'lucide-react';

interface Row {
  id: number;
  email: string;
  utr: string;
  amount_inr: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export function AdminUpiPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/upi', { cache: 'no-store' });
      if (res.ok) setRows((await res.json()).payments || []);
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  const act = async (id: number, action: 'approve' | 'reject') => {
    if (action === 'approve' && !confirm('Did you check this UTR in your bank/UPI app? Approve and give 30 days of Pro?')) return;
    setBusy(id);
    setError('');
    try {
      const res = await fetch('/api/admin/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed');
      load();
    } catch (err: any) {
      setError(err.message || 'Failed');
    } finally {
      setBusy(null);
    }
  };

  const pending = rows.filter((r) => r.status === 'pending');
  const done = rows.filter((r) => r.status !== 'pending').slice(0, 10);

  return (
    <section className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
      <h2 className="text-base font-black text-white flex items-center gap-2">
        <BadgeIndianRupee className="w-4 h-4 text-emerald-400" /> UPI Payments to Verify
        {pending.length > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black">
            {pending.length} pending
          </span>
        )}
      </h2>
      <p className="text-[11px] text-slate-400">
        Match the UTR with your bank/UPI app history, then press Approve to give 30 days of Pro (adds on top if already active).
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}

      {pending.length === 0 && <p className="text-xs text-slate-400">No pending payments.</p>}
      {pending.map((r) => (
        <div
          key={r.id}
          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <p className="text-xs font-bold text-white truncate">{r.email}</p>
            <p className="text-[11px] text-amber-400">
              UTR {r.utr} • ₹{r.amount_inr} • {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              disabled={busy === r.id}
              onClick={() => act(r.id, 'approve')}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 text-xs font-black disabled:opacity-50"
            >
              Approve
            </button>
            <button
              disabled={busy === r.id}
              onClick={() => act(r.id, 'reject')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-red-400 text-xs font-bold disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}

      {done.length > 0 && (
        <div className="pt-2 space-y-1">
          <p className="text-[11px] font-bold uppercase text-slate-500">Recently reviewed</p>
          {done.map((r) => (
            <p key={r.id} className="text-[11px] text-slate-400">
              {r.email} • {r.utr} •{' '}
              <span className={r.status === 'approved' ? 'text-emerald-400' : 'text-red-400'}>{r.status}</span>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
