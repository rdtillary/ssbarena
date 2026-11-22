'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';
import { PRO_PRICE_INR, ORIGINAL_PRICE_INR } from '@/lib/pricing';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  onSuccess: () => void;
  onRequireAuth: () => void;
}

interface Sub {
  status: 'authenticated' | 'active' | 'cancelling';
  current_end: string | null;
}

export function ProCheckoutModal({ open, onClose, userEmail, onSuccess, onRequireAuth }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sub, setSub] = useState<Sub | null>(null);
  const [cancelled, setCancelled] = useState(false);

  const loadSub = async () => {
    try {
      const res = await fetch('/api/razorpay/subscription', { cache: 'no-store' });
      if (res.ok) setSub((await res.json()).subscription || null);
    } catch {}
  };

  useEffect(() => {
    if (open && userEmail) loadSub();
  }, [open, userEmail]);

  if (!open) return null;

  const loadRazorpayScript = () =>
    new Promise<boolean>((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });

  const handleSubscribe = async () => {
    if (!userEmail) {
      onClose();
      onRequireAuth();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error('Could not load Razorpay checkout. Check your connection.');

      const res = await fetch('/api/razorpay/create-subscription', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start the subscription');

      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: 'SSB Arena',
        description: `SSB Arena Pro - ₹${PRO_PRICE_INR}/month autopay`,
        prefill: { email: userEmail },
        theme: { color: '#F59E0B' },
        handler: async function (response: any) {
          const verifyRes = await fetch('/api/razorpay/verify-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response),
          });
          if (verifyRes.ok) {
            onSuccess();
            onClose();
          } else {
            setError('Payment received, activation pending. Refresh in 10 seconds.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel autopay? You keep Pro until the end of the period you already paid for.')) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/razorpay/subscription', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not cancel.');
      setCancelled(true);
      loadSub();
    } catch (err: any) {
      setError(err.message || 'Could not cancel.');
    } finally {
      setLoading(false);
    }
  };

  const endText = sub?.current_end ? new Date(sub.current_end).toLocaleDateString() : null;
  const hasSub = sub && (sub.status === 'active' || sub.status === 'authenticated');
  const isCancelling = sub?.status === 'cancelling' || cancelled;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> MONTHLY PRO · AUTOPAY
        </div>

        <h2 className="text-2xl font-black text-white">Unlock All PPDT &amp; OIR Drills</h2>
        <p className="text-slate-400 text-sm mt-1">
          Subscribe once with UPI AutoPay or card. Renews every month until you cancel.
        </p>

        <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-baseline justify-between">
          <div>
            {ORIGINAL_PRICE_INR ? (
              <span className="text-lg font-bold text-slate-500 line-through mr-2">₹{ORIGINAL_PRICE_INR}</span>
            ) : null}
            <span className="text-3xl font-black text-amber-400">₹{PRO_PRICE_INR}</span>
            <span className="text-slate-400 text-xs ml-2">per month • cancel anytime</span>
          </div>
          <span className="text-xs text-emerald-400 font-medium">Instant Activation</span>
        </div>

        <ul className="space-y-2.5 text-sm text-slate-300 mb-5">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            All Real Hazy PPDT Scenes &amp; Recommended Stories
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            AI Transcripts, 15-OLQ Analysis &amp; Recommendation Meter
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Full OIR Verbal &amp; Non-Verbal Speed Sets with Solutions
          </li>
        </ul>

        {error && (
          <p className="text-xs text-red-400 bg-red-950/50 border border-red-800 rounded-lg p-2.5 mb-3">
            {error}
          </p>
        )}

        {hasSub && !isCancelling ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-400 bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-3">
              Autopay is on. ₹{PRO_PRICE_INR} is charged every month{endText ? `; next renewal around ${endText}` : ''}.
            </p>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-red-300 font-bold text-sm disabled:opacity-50"
            >
              {loading ? 'Please wait...' : 'Cancel autopay'}
            </button>
          </div>
        ) : isCancelling ? (
          <p className="text-sm text-amber-300 bg-amber-950/30 border border-amber-800/50 rounded-lg p-3 flex items-start gap-2">
            <RefreshCw className="w-4 h-4 mt-0.5 shrink-0" />
            Autopay is cancelled. You keep Pro until the end of the period you already paid for{endText ? ` (${endText})` : ''}.
          </p>
        ) : (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base transition disabled:opacity-50"
          >
            {loading ? 'Opening Razorpay...' : `Subscribe ₹${PRO_PRICE_INR}/month`}
          </button>
        )}

        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Secured by Razorpay • UPI AutoPay / Card
        </p>
        <p className="text-[10px] text-slate-500 text-center mt-1.5">
          You authorise ₹{PRO_PRICE_INR} to be charged every month until you cancel here.
        </p>
      </div>
    </div>
  );
}
