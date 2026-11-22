'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Download, RefreshCw } from 'lucide-react';

interface UserRow {
  id: string;
  email: string;
  name: string;
  provider: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed: boolean;
  plan: 'Free' | 'Pro' | 'No expiry';
  pro_expires_at: string | null;
  subscription_status: string | null;
  subscription_end: string | null;
  ppdt_attempts: number;
  oir_attempts: number;
  last_attempt_at: string | null;
  target_board: string | null;
  reporting_date: string | null;
}

const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtTime = (d: string | null) => (d ? new Date(d).toLocaleString() : '—');

export function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'pro' | 'free'>('all');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/users', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not load users');
      setUsers(data.users || []);
    } catch (e: any) {
      setError(e.message || 'Could not load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const proCount = users.filter((u) => u.plan !== 'Free').length;

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'pro' && u.plan === 'Free') return false;
      if (filter === 'free' && u.plan !== 'Free') return false;
      if (!needle) return true;
      return (
        u.email.toLowerCase().includes(needle) ||
        u.name.toLowerCase().includes(needle) ||
        (u.target_board || '').toLowerCase().includes(needle)
      );
    });
  }, [users, q, filter]);

  const exportCsv = () => {
    const head = [
      'Email', 'Name', 'Plan', 'Pro until', 'Autopay', 'Joined', 'Last sign-in',
      'PPDT attempts', 'OIR attempts', 'Last attempt', 'Target centre', 'Reporting date',
    ];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = shown.map((u) =>
      [
        u.email, u.name, u.plan, u.pro_expires_at ? fmt(u.pro_expires_at) : u.plan === 'No expiry' ? 'No expiry' : '',
        u.subscription_status || '', fmt(u.created_at), fmt(u.last_sign_in_at),
        u.ppdt_attempts, u.oir_attempts, fmt(u.last_attempt_at), u.target_board || '', u.reporting_date || '',
      ].map(esc).join(',')
    );
    const blob = new Blob([[head.map(esc).join(','), ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ssb-arena-users.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-400">Total users</p>
          <p className="text-2xl font-black text-white">{users.length}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-400">Pro</p>
          <p className="text-2xl font-black text-emerald-400">{proCount}</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-[10px] font-bold uppercase text-slate-400">Free</p>
          <p className="text-2xl font-black text-amber-400">{users.length - proCount}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email, name or centre..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-white"
        />
        {(['all', 'pro', 'free'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-bold uppercase ${
              filter === f ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {f}
          </button>
        ))}
        <button onClick={load} className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300" title="Refresh">
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={exportCsv}
          className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {loading && <p className="text-xs text-slate-400">Loading users...</p>}

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400 border-b border-slate-800">
              <th className="p-3">User</th>
              <th className="p-3">Plan</th>
              <th className="p-3">Joined</th>
              <th className="p-3">Last seen</th>
              <th className="p-3">PPDT</th>
              <th className="p-3">OIR</th>
              <th className="p-3">Centre</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((u) => (
              <React.Fragment key={u.id}>
                <tr
                  onClick={() => setOpen(open === u.id ? null : u.id)}
                  className="border-b border-slate-800/60 hover:bg-slate-950/60 cursor-pointer"
                >
                  <td className="p-3">
                    <p className="font-bold text-white">{u.email || '—'}</p>
                    {u.name && <p className="text-slate-400">{u.name}</p>}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-black ${
                        u.plan === 'Free' ? 'bg-slate-800 text-slate-300' : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {u.plan}
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{fmt(u.created_at)}</td>
                  <td className="p-3 text-slate-300">{fmt(u.last_sign_in_at)}</td>
                  <td className="p-3 text-white font-bold">{u.ppdt_attempts}</td>
                  <td className="p-3 text-white font-bold">{u.oir_attempts}</td>
                  <td className="p-3 text-slate-300">{u.target_board || '—'}</td>
                </tr>
                {open === u.id && (
                  <tr className="bg-slate-950/70 border-b border-slate-800/60">
                    <td colSpan={7} className="p-4">
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-slate-300">
                        <p><span className="text-slate-500">User ID:</span> {u.id}</p>
                        <p><span className="text-slate-500">Sign-in method:</span> {u.provider || '—'}</p>
                        <p><span className="text-slate-500">Joined:</span> {fmtTime(u.created_at)}</p>
                        <p><span className="text-slate-500">Last sign-in:</span> {fmtTime(u.last_sign_in_at)}</p>
                        <p><span className="text-slate-500">Email confirmed:</span> {u.email_confirmed ? 'Yes' : 'No'}</p>
                        <p>
                          <span className="text-slate-500">Pro until:</span>{' '}
                          {u.plan === 'No expiry' ? 'No expiry' : u.pro_expires_at ? fmtTime(u.pro_expires_at) : '—'}
                        </p>
                        <p>
                          <span className="text-slate-500">Autopay:</span> {u.subscription_status || 'none'}
                          {u.subscription_end ? ` (renews ~${fmt(u.subscription_end)})` : ''}
                        </p>
                        <p><span className="text-slate-500">Last practice:</span> {fmtTime(u.last_attempt_at)}</p>
                        <p><span className="text-slate-500">Target centre:</span> {u.target_board || '—'}</p>
                        <p><span className="text-slate-500">Reporting date:</span> {u.reporting_date || '—'}</p>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {!loading && shown.length === 0 && (
          <p className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <Users className="w-4 h-4" /> No users match.
          </p>
        )}
      </div>
    </section>
  );
}
