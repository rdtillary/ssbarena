'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, Download, RefreshCw } from 'lucide-react';
import { ResultView } from '@/components/AdminResultView';

interface UserRow {
  id: string;
  email: string;
  phone: string;
  login: string;
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
  wat_attempts: number;
  last_attempt_at: string | null;
  target_board: string | null;
  reporting_date: string | null;
  role: string | null;
  exam: string | null;
}

const ROLE_LABEL: Record<string, string> = {
  ssb_upcoming: 'SSB is coming up',
  aspirant: 'Aspirant',
  preparing: 'Preparing for exam',
  curious: 'Just curious',
};

const fmt = (d: string | null | undefined) => (d ? new Date(d).toLocaleDateString() : '—');
const fmtTime = (d: string | null | undefined) => (d ? new Date(d).toLocaleString() : '—');
const rupees = (n: number | null | undefined) => (n == null ? '—' : `₹${n}`);

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <p>
      <span className="text-slate-500">{k}:</span> {v === null || v === undefined || v === '' ? '—' : v}
    </p>
  );
}

function Box({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">{title}</p>
      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-slate-300">{children}</div>
    </div>
  );
}

function SessionRow({ s }: { s: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{s.scenario_title || 'PPDT'}</p>
          <p className="text-[11px] text-slate-500">
            {fmtTime(s.created_at)}
            {s.source === 'recording' ? ' • recording only (no saved result)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {s.total_score != null ? (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-black">
              {s.total_score}/{s.max_score}
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-xs font-bold">Not graded</span>
          )}
          <span className="text-[11px] font-bold text-amber-400">{open ? 'Hide' : 'Full result'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3">
          <ResultView item={s} />
        </div>
      )}
    </div>
  );
}

function WatRow({ w }: { w: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800">
      <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">{w.title}</p>
          <p className="text-[11px] text-slate-500">
            {fmtTime(w.created_at)} • {w.mode === 'write' ? 'pen & paper' : 'typed in app'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-xs font-black">
            {w.answered}/{w.total}
          </span>
          <span className="text-[11px] font-bold text-amber-400">{open ? 'Hide' : 'All sentences'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {(w.responses || []).map((r: any, i: number) => (
            <div key={i} className="flex gap-3 p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs">
              <span className="w-6 shrink-0 font-mono text-slate-500">{i + 1}</span>
              <span className="w-28 shrink-0 font-black text-amber-400">{r.word}</span>
              <span className={r.sentence ? 'text-slate-100' : 'text-slate-600'}>
                {r.sentence || (w.mode === 'write' ? '(written on paper)' : '— skipped')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserPanel({ id }: { id: string }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let live = true;
    fetch(`/api/admin/user-detail?user_id=${id}`, { cache: 'no-store' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Could not load this user');
        if (live) setD(j);
      })
      .catch((e) => live && setErr(e.message));
    return () => {
      live = false;
    };
  }, [id]);

  if (err) return <p className="p-4 text-xs text-red-400">{err}</p>;
  if (!d) return <p className="p-4 text-xs text-slate-400">Loading everything about this user…</p>;

  const a = d.account;
  const p = d.profile || {};
  const o = d.onboarding;

  return (
    <div className="space-y-3 p-4">
      <Box title="Account">
        <KV k="User ID" v={a.id} />
        <KV k="Email" v={/@phone\.ssbarena\.in$/i.test(a.email) ? '—' : a.email} />
        <KV k="Mobile" v={p.phone || a.phone} />
        <KV k="Sign-in method" v={/@phone\.ssbarena\.in$/i.test(a.email) ? 'mobile number' : a.provider} />
        <KV k="Joined" v={fmtTime(a.created_at)} />
        <KV k="Last sign-in" v={fmtTime(a.last_sign_in_at)} />
        <KV k="Name" v={p.full_name} />
        <KV k="Email confirmed" v={a.email_confirmed ? 'Yes' : 'No'} />
      </Box>

      <Box title="Quiz answers (at sign-up)">
        <KV k="Who they are" v={o ? ROLE_LABEL[o.role] || o.role : 'Quiz not completed'} />
        <KV k="Exam" v={o?.exam} />
        <KV k="SSB centre" v={o?.ssb_centre} />
        <KV k="Reporting date" v={o?.reporting_date} />
        <KV k="Answered on" v={fmtTime(o?.updated_at || o?.created_at)} />
      </Box>

      <Box title="Plan & payments">
        <KV k="Pro" v={p.is_pro ? (p.pro_expires_at ? `until ${fmtTime(p.pro_expires_at)}` : 'Yes (no expiry)') : 'No'} />
        <KV k="Target centre (profile)" v={p.target_board} />
        <KV k="Reporting date (profile)" v={p.reporting_date} />
        <KV k="Referred by" v={d.referral?.creators ? `${d.referral.creators.name} (${d.referral.creators.code})` : null} />
        <KV k="Messages to Cadet" v={d.message_count} />
        {d.subscriptions.map((s: any) => (
          <KV key={s.id} k="Autopay" v={`${s.status}${s.current_end ? `, renews ~${fmt(s.current_end)}` : ''} (started ${fmt(s.created_at)})`} />
        ))}
        {d.upi_payments.map((u: any) => (
          <KV key={u.id} k="UPI payment" v={`${rupees(u.amount_inr)} • UTR ${u.utr} • ${u.status} • ${fmt(u.created_at)}`} />
        ))}
        {d.orders.map((x: any) => (
          <KV key={x.id} k="Razorpay order" v={`${rupees(x.amount_paise != null ? x.amount_paise / 100 : null)} • ${x.status} • ${fmt(x.created_at)}`} />
        ))}
      </Box>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">
          PPDT practice ({d.sessions.length}) — tap one to see the full result page
        </p>
        {d.sessions.length === 0 && <p className="text-xs text-slate-500">No PPDT attempts yet.</p>}
        {d.sessions.map((s: any) => (
          <SessionRow key={`${s.source}-${s.id}`} s={s} />
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">WAT practice ({(d.wat || []).length})</p>
        {(d.wat || []).length === 0 && <p className="text-xs text-slate-500">No WAT attempts yet.</p>}
        {(d.wat || []).map((w: any) => (
          <WatRow key={w.id} w={w} />
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">OIR drills ({d.oir.length})</p>
        {d.oir.length === 0 && <p className="text-xs text-slate-500">No OIR attempts yet.</p>}
        {d.oir.map((x: any) => (
          <div key={x.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            <span className="text-slate-200 truncate">{x.title}</span>
            <span className="text-slate-400 shrink-0">
              {fmtTime(x.created_at)} • <b className="text-emerald-400">{x.score}/{x.max}</b>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      return [u.login, u.name, u.phone, u.target_board || '', u.exam || ''].some((x) => x.toLowerCase().includes(needle));
    });
  }, [users, q, filter]);

  const exportCsv = () => {
    const head = [
      'Login', 'Name', 'Plan', 'Pro until', 'Autopay', 'Joined', 'Last sign-in',
      'PPDT attempts', 'OIR attempts', 'WAT attempts', 'Last attempt', 'Who', 'Exam', 'Target centre', 'Reporting date',
    ];
    const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = shown.map((u) =>
      [
        u.login, u.name, u.plan, u.pro_expires_at ? fmt(u.pro_expires_at) : u.plan === 'No expiry' ? 'No expiry' : '',
        u.subscription_status || '', fmt(u.created_at), fmt(u.last_sign_in_at),
        u.ppdt_attempts, u.oir_attempts, u.wat_attempts, fmt(u.last_attempt_at),
        u.role ? ROLE_LABEL[u.role] || u.role : '', u.exam || '', u.target_board || '', u.reporting_date || '',
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
          placeholder="Search email, mobile, name, exam or centre..."
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
              <th className="p-3">WAT</th>
              <th className="p-3">Exam</th>
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
                    <p className="font-bold text-white">{u.login || '—'}</p>
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
                  <td className="p-3 text-white font-bold">{u.wat_attempts}</td>
                  <td className="p-3 text-slate-300">{u.exam || '—'}</td>
                  <td className="p-3 text-slate-300">{u.target_board || '—'}</td>
                </tr>
                {open === u.id && (
                  <tr className="bg-slate-950/70 border-b border-slate-800/60">
                    <td colSpan={9} className="p-0">
                      <UserPanel id={u.id} />
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
