'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/admin', label: 'Manage' },
  { href: '/admin/user-data', label: 'User Data' },
  { href: '/admin/creators', label: 'Creator Partnerships' },
];

export function AdminNav() {
  const path = usePathname() || '';
  return (
    <div className="max-w-4xl mx-auto px-4 pt-4 flex flex-wrap gap-2">
      {TABS.map((t) => {
        const active = t.href === '/admin' ? path === '/admin' : path.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`px-4 py-2.5 rounded-xl text-xs font-black text-center ${
              active ? 'bg-amber-500 text-slate-950' : 'bg-slate-900 border border-slate-800 text-slate-300'
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
