'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Copy, BadgeIndianRupee } from 'lucide-react';

interface Creator {
  id: number;
  code: string;
  name: string;
  email: string | null;
  commission_pct: number;
  active: boolean;
  referred: number;
  paying: number;
  earned_paise: number;
  pending_paise: number;
}

const rupees = (p: number) => `₹${(p / 100).toFixed(2)}`;

export function AdminCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [msg, setMsg] = useState('');
  const [origin, setOrigin] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [pct, setPct] = useState('10');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/creators', { cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(d.error || 'Could not load creators');
    setCreators(d.creators || []);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  const send = async (method: string, body: any) => {
    const res = await fetch('/api/admin/creators', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || 'Failed');
    return d;
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      await send('POST', { action: 'create', name, code, email, commission_pct: Number(pct) });
      setMsg('Creator added. Copy their link below.');
      setName('');
      setCode('');
      setEmail('');
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (c: Creator) => {
    try {
      await navigator.clipboard.writeText(`${origin}/r/${c.code}`);
      setMsg(`Link copied: ${origin}/r/${c.code}`);
    } catch {
      setMsg('Error: copy failed. Select the link and copy it manually.');
    }
  };

  const changePct = async (c: Creator) => {
    const v = prompt(`Commission % for ${c.name} (applies to future payments)`, String(c.commission_pct));
    if (v === null) return;
    try {
      await send('PATCH', { id: c.id, commission_pct: Number(v) });
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const toggle = async (c: Creator) => {
    await send('PATCH', { id: c.id, active: !c.active }).catch(() => {});
    load();
  };

  const payout = async (c: Creator) => {
    if (!confirm(`Mark ${rupees(c.pending_paise)} as paid to ${c.name}? Do this after you have sent the money.`)) return;
    try {
      const d = await send('POST', { action: 'payout', id: c.id });
      setMsg(`Marked ${rupees(d.paid_paise)} as paid to ${c.name}.`);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const totalPending = creators.reduce((s, c) => s + c.pending_paise, 0);

  return (
    <section className="space-y-4">
      {msg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold ${
            msg.startsWith('Error')
              ? 'bg-red-950/60 border-red-700 text-red-300'
              : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
          }`}
        >
          {msg}
        </div>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-400" /> Add Creator Referral Link
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Creator name" value={name} onChange={(e) => setName(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
          <input required placeholder="Link code (e.g. rahul)" value={code}
            onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
          <input type="email" placeholder="Creator email (optional, blocks self-referral)" value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white" />
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Commission %
            <input type="number" min={0} max={100} step="0.5" value={pct} onChange={(e) => setPct(e.target.value)}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white" />
            <span className="text-slate-500">of every payment</span>
          </label>
        </div>
        <p className="text-[11px] text-slate-500">
          Link will be {origin || 'https://yoursite'}/r/{code || 'code'}. The creator earns on every monthly payment of
          each user who signed up through it.
        </p>
        <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-50">
          {busy ? 'Saving...' : 'Create Link'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">Creators ({creators.length})</h2>
        <p className="text-xs font-bold text-amber-400">Total unpaid: {rupees(totalPending)}</p>
      </div>

      {creators.length === 0 && <p className="text-xs text-slate-400">No creators yet.</p>}
      {creators.map((c) => (
        <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">
                {c.name}{' '}
                <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-black ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                  {c.active ? 'ACTIVE' : 'PAUSED'}
                </span>
              </p>
              <p className="text-[11px] text-slate-400 truncate">{origin}/r/{c.code}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => copy(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-amber-400 flex items-center gap-1">
                <Copy className="w-3.5 h-3.5" /> Copy link
              </button>
              <button onClick={() => changePct(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                {c.commission_pct}% · Edit
              </button>
              <button onClick={() => toggle(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                {c.active ? 'Pause' : 'Resume'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              ['Signed up', String(c.referred)],
              ['Paid users', String(c.paying)],
              ['Total earned', rupees(c.earned_paise)],
              ['Unpaid', rupees(c.pending_paise)],
            ].map(([l, v]) => (
              <div key={l} className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-[9px] uppercase font-bold text-slate-500">{l}</p>
                <p className="text-sm font-black text-white">{v}</p>
              </div>
            ))}
          </div>
          {c.pending_paise > 0 && (
            <button onClick={() => payout(c)} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5">
              <BadgeIndianRupee className="w-4 h-4" /> Mark {rupees(c.pending_paise)} as paid
            </button>
          )}
        </div>
      ))}
    </section>
  );
}
