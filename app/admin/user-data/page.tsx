'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdminUserData } from '@/components/AdminUserData';
import { AdminUsers } from '@/components/AdminUsers';

export default function UserDataAdminPage() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<'users' | 'visits'>('users');
  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const e = data?.user?.email?.toLowerCase();
      const a = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
      setOk(Boolean(e && a && e === a));
    });
  }, []);
  if (ok === null) return <div className="p-8 text-center text-slate-400 text-sm">Verifying admin access...</div>;
  if (!ok)
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-3">
        <p className="text-lg font-black text-red-400">Admin Access Restricted</p>
        <Link href="/" className="inline-block px-4 py-2 rounded-lg bg-amber-500 text-slate-950 text-xs font-bold">Back to Home</Link>
      </div>
    );
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to Admin
        </Link>
        <span className="px-2.5 py-1 rounded bg-red-600/20 text-red-400 text-xs font-black">USER DATA</span>
      </div>

      <div className="flex gap-2">
        {([
          ['users', 'All Users'],
          ['visits', 'Visits & Recordings'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase ${
              tab === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' ? <AdminUsers /> : <AdminUserData />}
    </div>
  );
}
