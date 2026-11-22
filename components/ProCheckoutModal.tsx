'use client';

import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { PRO_PRICE_INR } from '@/lib/config';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface Props {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
  isPro?: boolean;
  proUntil?: string | null;
  onSuccess: () => void;
  onRequireAuth: () => void;
}

interface SubInfo {
  status: string;
  current_end: string | null;
}

export function ProCheckoutModal({
  open,
  onClose,
  userEmail,
  isPro = false,
  proUntil = null,
  onSuccess,
  onRequireAuth,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const priceInr = PRO_PRICE_INR;

  const loadSub = async () => {
    try {
      const res = await fetch('/api/razorpay/subscription', { cache: 'no-store' });
      const data = await res.json();
      setSub(data?.subscription || null);
    } catch {
      setSub(null);
    }
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setNotice('');
    if (userEmail) loadSub();
    else setSub(null);
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

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const handlePay = async () => {
    if (!userEmail) {
      onClose();
      onRequireAuth();
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
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
        description: `Pro Subscription: ₹${priceInr}/month (autopay, cancel any time)`,
        prefill: { email: userEmail },
        theme: { color: '#F59E0B' },
        modal: {
          ondismiss: () => setError('Payment cancelled. You can try again any time.'),
        },
        handler: async function (response: any) {
          setError('');
          try {
            const verifyRes = await fetch('/api/razorpay/verify-subscription', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_subscription_id: response.razorpay_subscription_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (verifyRes.ok) {
              onSuccess();
              onClose();
            } else {
              setError('Payment received, activation pending. Refresh in 10 seconds.');
            }
          } catch {
            setError('Payment received, activation pending. Refresh in 10 seconds.');
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp?.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment initialization failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel autopay? You keep Pro until the end of the month you have paid for.')) return;
    setCancelling(true);
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/razorpay/subscription', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not cancel. Please try again.');
      setNotice('Autopay cancelled. No further charges will be made.');
      await loadSub();
    } catch (err: any) {
      setError(err.message || 'Could not cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const hasSub = Boolean(sub);
  const isCancelling = sub?.status === 'cancelling';
  // Pro without a subscription row (manual grant or an earlier one-time payment): info only.
  const proInfoOnly = isPro && !hasSub;
  const showManage = hasSub || isPro;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" /> PRO SUBSCRIPTION
        </div>

        <h2 className="text-2xl font-black text-white">
          {showManage ? 'Your Pro Subscription' : 'Unlock All PPDT & OIR Drills'}
        </h2>
        <p className="text-slate-400 text-sm mt-1">
          {proInfoOnly
            ? proUntil
              ? `Pro is active until ${fmtDate(proUntil)}.`
              : 'Pro is active on your account.'
            : hasSub
            ? isCancelling
              ? `Autopay is cancelled. Pro stays active until ${fmtDate(sub!.current_end) || 'the end of your paid month'}.`
              : `Autopay is on: ₹${priceInr} is charged every month.${
                  sub!.current_end ? ` Next renewal around ${fmtDate(sub!.current_end)}.` : ''
                }`
            : `₹${priceInr} per month via UPI AutoPay or card. Cancel any time.`}
        </p>

        {!showManage && (
          <div className="my-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-baseline justify-between">
            <div>
              <span className="text-3xl font-black text-amber-400">₹{priceInr}</span>
              <span className="text-slate-400 text-xs ml-2">per month • autopay</span>
            </div>
            <span className="text-xs text-emerald-400 font-medium">Instant Activation</span>
          </div>
        )}

        <ul className="space-y-2.5 text-sm text-slate-300 my-5">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            All 10+ Real Hazy PPDT Scenes &amp; Recommended Stories
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            Unlimited 1-Min Narration Audio Storage &amp; AI Transcripts
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
        {notice && (
          <p className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800 rounded-lg p-2.5 mb-3">
            {notice}
          </p>
        )}

        {proInfoOnly ? null : hasSub ? (
          !isCancelling && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-red-300 font-bold text-sm transition disabled:opacity-50"
            >
              {cancelling ? 'Cancelling...' : 'Cancel autopay'}
            </button>
          )
        ) : (
          <>
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-base transition disabled:opacity-50"
            >
              {loading ? 'Opening Razorpay...' : `Subscribe ₹${priceInr}/month`}
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2">
              By subscribing you authorise a recurring monthly charge of ₹{priceInr} until you cancel.
            </p>
          </>
        )}

        <p className="text-[11px] text-slate-500 text-center mt-3 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Secured by Razorpay • UPI / GPay / PhonePe Supported
        </p>
      </div>
    </div>
  );
}
