import Link from 'next/link';
import { Mic2 } from 'lucide-react';

/** Home-page banner that opens the Lecturette section. */
export function LecturetteEntry() {
  return (
    <Link
      href="/lecturette"
      className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-amber-500/40 hover:border-amber-500"
    >
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center">
          <Mic2 className="w-5 h-5 text-amber-400" />
        </span>
        <div>
          <p className="text-[10px] font-black uppercase text-amber-400">New • GTO Task</p>
          <p className="text-sm font-black text-white">Lecturette — Spin a topic, speak for 3 minutes</p>
        </div>
      </div>
      <span className="text-xs font-black text-amber-400 shrink-0">Open →</span>
    </Link>
  );
}
