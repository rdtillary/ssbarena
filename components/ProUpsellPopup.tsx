'use client';

import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PRO_PRICE_INR } from '@/lib/config';
import { ProCheckoutModal } from '@/components/ProCheckoutModal';
import { AuthModal } from '@/components/AuthModal';

/**
 * Shown after every completed test (OIR, PPDT, WAT, SRT, TAT, Lecturette) to non-Pro users.
 * Render it with `show` = true once the test is finished. Pro users never see it.
 */
export function ProUpsellPopup({ show }: { show: boolean }) {
  const [supabase] = useState(() => createClient());
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState<boolean | null>(null);
  const [proUntil, setProUntil] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const load = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      setUser(auth.user || null);
      if (!auth.user) return setIsPro(false);
      const { data: p } = await supabase
        .from('profiles')
        .select('is_pro, pro_expires_at')
        .eq('id', auth.user.id)
        .maybeSingle();
      setProUntil(p?.pro_expires_at || null);
      setIsPro(Boolean(p?.is_pro && (!p.pro_expires_at || new Date(p.pro_expires_at) > new Date())));
    } catch {
      setIsPro(false);
    }
  };

  useEffect(() => {
    if (show) load();
  }, [show]);

  // Fresh popup for every new attempt.
  useEffect(() => {
    if (!show) setDismissed(false);
  }, [show]);

  if (!show || isPro === null) return null;

  return (
    <>
      {!isPro && !dismissed && !checkoutOpen && !authOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 relative shadow-2xl text-center">
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" /> GO PRO
            </div>
            <h2 className="text-xl font-black text-white">Take Pro to practice more!</h2>
            <p className="text-slate-400 text-sm mt-2">
              Unlock every PPDT, OIR, WAT, SRT, TAT and Lecturette set. Practice more, get selected.
            </p>
            <button
              onClick={() => setCheckoutOpen(true)}
              className="mt-5 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base transition"
            >
              Get Pro for ₹{PRO_PRICE_INR}
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="mt-2 text-xs text-slate-500 hover:text-slate-300 py-2"
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthenticated={load} />
      <ProCheckoutModal
        open={checkoutOpen}
        onClose={() => {
          setCheckoutOpen(false);
          setDismissed(true);
        }}
        userEmail={user?.email}
        isPro={Boolean(isPro)}
        proUntil={proUntil}
        onSuccess={load}
        onRequireAuth={() => setAuthOpen(true)}
      />
    </>
  );
}
