'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Link2, Copy, BadgeIndianRupee, Instagram } from 'lucide-react';

interface Creator {
  id: number;
  code: string;
  name: string;
  email: string | null;
  instagram_handle: string | null;
  notes: string | null;
  commission_pct: number;
  per_click_paise: number;
  active: boolean;
  clicks: number;
  unique_clicks: number;
  unpaid_clicks: number;
  referred: number;
  paying: number;
  earned_paise: number;
  pending_commission_paise: number;
  pending_click_paise: number;
}

const rupees = (p: number) => `₹${(p / 100).toFixed(2)}`;
const inp = 'px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white';

export function AdminCreators() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [msg, setMsg] = useState('');
  const [origin, setOrigin] = useState('');
  const [f, setF] = useState({ name: '', code: '', insta: '', email: '', notes: '', pct: '0', perClick: '0' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/creators', { cache: 'no-store' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(`Error: ${d.error || 'Could not load creators'}`);
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
      await send('POST', {
        action: 'create',
        name: f.name,
        code: f.code,
        email: f.email,
        instagram_handle: f.insta,
        notes: f.notes,
        commission_pct: Number(f.pct),
        per_click_rupees: Number(f.perClick),
      });
      setMsg('Creator added. Copy their link below and send it.');
      setF({ name: '', code: '', insta: '', email: '', notes: '', pct: '0', perClick: '0' });
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

  const edit = async (c: Creator, field: 'pct' | 'click') => {
    const label = field === 'pct' ? 'Commission % of each payment' : 'Rupees paid per unique click';
    const cur = field === 'pct' ? c.commission_pct : c.per_click_paise / 100;
    const v = prompt(`${label} for ${c.name} (applies going forward)`, String(cur));
    if (v === null) return;
    try {
      await send('PATCH', { id: c.id, ...(field === 'pct' ? { commission_pct: Number(v) } : { per_click_rupees: Number(v) }) });
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
    const due = c.pending_commission_paise + c.pending_click_paise;
    if (!confirm(`Mark ${rupees(due)} as paid to ${c.name}? Do this after you have sent the money.`)) return;
    try {
      const d = await send('POST', { action: 'payout', id: c.id });
      setMsg(`Marked ${rupees(d.paid_paise)} as paid to ${c.name}.`);
      load();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    }
  };

  const totalDue = creators.reduce((s, c) => s + c.pending_commission_paise + c.pending_click_paise, 0);

  return (
    <section className="space-y-4">
      {msg && (
        <div className={`p-3 rounded-xl border text-xs font-bold ${msg.startsWith('Error') ? 'bg-red-950/60 border-red-700 text-red-300' : 'bg-emerald-950/60 border-emerald-700 text-emerald-300'}`}>
          {msg}
        </div>
      )}

      <form onSubmit={create} className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-base font-black text-white flex items-center gap-2">
          <Link2 className="w-4 h-4 text-amber-400" /> Add Partner &amp; Generate Link
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <input required placeholder="Creator name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inp} />
          <input placeholder="Instagram handle (e.g. rahul.ssb)" value={f.insta} onChange={(e) => setF({ ...f, insta: e.target.value })} className={inp} />
          <input required placeholder="Link code (e.g. rahul)" value={f.code}
            onChange={(e) => setF({ ...f, code: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') })} className={inp} />
          <input type="email" placeholder="Creator email (optional, blocks self-referral)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inp} />
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            ₹ per unique click
            <input type="number" min={0} step="0.1" value={f.perClick} onChange={(e) => setF({ ...f, perClick: e.target.value })}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white" />
          </label>
          <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300">
            Commission %
            <input type="number" min={0} max={100} step="0.5" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white" />
            <span className="text-slate-500">of paid subscriptions</span>
          </label>
        </div>
        <input placeholder="Notes (deal terms, DM date...)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className={`w-full ${inp}`} />
        <p className="text-[11px] text-slate-500">
          Link: {origin || 'https://yoursite'}/r/{f.code || 'code'}. You can pay per click, per paying subscriber, or both (set either to 0 to turn it off).
          Repeat visits from the same browser count as one unique click; bots are ignored.
        </p>
        <button disabled={busy} className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs disabled:opacity-50">
          {busy ? 'Saving...' : 'Create Partner Link'}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-black text-white">Partners ({creators.length})</h2>
        <p className="text-xs font-bold text-amber-400">Total unpaid: {rupees(totalDue)}</p>
      </div>

      {creators.length === 0 && <p className="text-xs text-slate-400">No partners yet.</p>}
      {creators.map((c) => {
        const due = c.pending_commission_paise + c.pending_click_paise;
        return (
          <div key={c.id} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">
                  {c.name}{' '}
                  <span className={`ml-1 px-2 py-0.5 rounded text-[10px] font-black ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    {c.active ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </p>
                {c.instagram_handle && (
                  <a href={`https://instagram.com/${c.instagram_handle}`} target="_blank" rel="noreferrer"
                    className="text-[11px] text-pink-400 inline-flex items-center gap-1">
                    <Instagram className="w-3 h-3" /> @{c.instagram_handle}
                  </a>
                )}
                <p className="text-[11px] text-slate-400 truncate">{origin}/r/{c.code}</p>
                {c.notes && <p className="text-[11px] text-slate-500">{c.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copy(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Copy className="w-3.5 h-3.5" /> Copy link
                </button>
                <button onClick={() => edit(c, 'click')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                  ₹{(c.per_click_paise / 100).toFixed(2)}/click · Edit
                </button>
                <button onClick={() => edit(c, 'pct')} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                  {c.commission_pct}% · Edit
                </button>
                <button onClick={() => toggle(c)} className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-xs font-bold text-slate-200">
                  {c.active ? 'Pause' : 'Resume'}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
              {[
                ['Clicks', String(c.clicks)],
                ['Unique', String(c.unique_clicks)],
                ['Signed up', String(c.referred)],
                ['Paid users', String(c.paying)],
                ['Total earned', rupees(c.earned_paise + c.pending_click_paise)],
                ['Unpaid', rupees(due)],
              ].map(([l, v]) => (
                <div key={l} className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <p className="text-[9px] uppercase font-bold text-slate-500">{l}</p>
                  <p className="text-sm font-black text-white">{v}</p>
                </div>
              ))}
            </div>
            {due > 0 && (
              <button onClick={() => payout(c)} className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5">
                <BadgeIndianRupee className="w-4 h-4" /> Mark {rupees(due)} as paid
                <span className="font-semibold opacity-70">
                  ({c.unpaid_clicks} clicks + {rupees(c.pending_commission_paise)} commission)
                </span>
              </button>
            )}
          </div>
        );
      })}
    </section>
  );
}
