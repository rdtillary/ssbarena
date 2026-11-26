import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 text-xs py-8 px-4 mb-16 md:mb-0">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} SSB Arena. Independent SSB Practice Simulator.</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/pricing" className="hover:text-amber-400">Pricing</Link>
          <Link href="/terms" className="hover:text-amber-400">Terms</Link>
          <Link href="/privacy" className="hover:text-amber-400">Privacy</Link>
          <Link href="/refund-policy" className="hover:text-amber-400">Refund Policy</Link>
          <Link href="/contact" className="hover:text-amber-400">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
