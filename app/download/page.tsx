import fs from 'fs';
import path from 'path';
import Link from 'next/link';
import { ArrowLeft, Download, Smartphone, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Download SSB Arena App (Android APK)',
};

const APK_PATH = '/downloads/ssb-arena.apk';

export default function DownloadPage() {
  let apkSize = '';
  let available = false;
  try {
    const stat = fs.statSync(path.join(process.cwd(), 'public', APK_PATH));
    available = stat.isFile();
    apkSize = `${(stat.size / (1024 * 1024)).toFixed(1)} MB`;
  } catch {}

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <Link href="/" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1">
        <ArrowLeft className="w-4 h-4" /> Back to SSB Arena
      </Link>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <Smartphone className="w-10 h-10 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-black text-white">SSB Arena for Android</h1>
        <p className="text-sm text-slate-300">
          Practice PPDT and OIR drills from your phone in a full-screen app.
        </p>

        {available ? (
          <a
            href={APK_PATH}
            download="SSB-Arena.apk"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
          >
            <Download className="w-4 h-4" /> Download APK {apkSize && `(${apkSize})`}
          </a>
        ) : (
          <p className="px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-400">
            The Android app is coming soon. Please check back shortly.
          </p>
        )}
      </div>

      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h2 className="text-sm font-black text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> How to install
        </h2>
        <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside">
          <li>Tap <b>Download APK</b> and open the downloaded file.</li>
          <li>
            If Android says &quot;install blocked&quot;, tap <b>Settings</b> and allow installs from this
            browser (&quot;Install unknown apps&quot;).
          </li>
          <li>Tap <b>Install</b>, then open <b>SSB Arena</b>.</li>
          <li>Allow the <b>microphone</b> when asked, which is needed for voice narration.</li>
        </ol>
        <p className="text-[11px] text-slate-500">
          This app is installed directly from our website, not from the Play Store, so Android shows
          the standard warning for apps from outside the Play Store.
        </p>
      </div>
    </div>
  );
}
