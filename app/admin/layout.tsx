import Link from 'next/link';

// Shows a "Creator Partnerships" button on every /admin page (no edit to app/admin/page.tsx needed).
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <Link
          href="/admin/creators"
          className="block p-3 rounded-xl bg-amber-500 text-slate-950 text-xs font-black text-center"
        >
          Creator Partnerships
        </Link>
      </div>
      {children}
    </>
  );
}
