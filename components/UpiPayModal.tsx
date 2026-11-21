'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { X, Copy, Check, Smartphone } from 'lucide-react';
import { PRO_PRICE_INR, PRO_PERIOD_DAYS, ORIGINAL_PRICE_INR } from '@/lib/pricing';

interface Props {
  open: boolean;
  onClose: () => void;
  signedIn: boolean;
  onRequireAuth: () => void;
}

interface Payment {
  id: number;
  utr: string;
  status: 'pending' | 'approved' | 'rejected';
}

const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || '';
const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME || 'SSB Arena';

export function UpiPayModal({ open, onClose, signedIn, onRequireAuth }: Props) {
  const [utr, setUtr] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const upiLink =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
    `&pn=${encodeURIComponent(UPI_NAME)}` +
    `&am=${PRO_PRICE_INR}&cu=INR&tn=${encodeURIComponent('SSB Arena Pro')}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(upiLink)}`;

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/upi/submit', { cache: 'no-store' });
      if (res.ok) setPayments((await res.json()).payments || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (open && signedIn) load();
  }, [open, signedIn, load]);

  if (!open) return null;

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/upi/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utr }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not submit.');
      setUtr('');
      load();
    } catch (err: any) {
      setError(err.message || 'Could not submit.');
    } finally {
      setSending(false);
    }
  };

  const hasPending = payments.some((p) => p.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full relative shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 space-y-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-baseline gap-2 flex-wrap">
              <span>SSB Arena Pro</span>
              {ORIGINAL_PRICE_INR ? (
                <span className="text-sm font-bold text-slate-500 line-through">₹{ORIGINAL_PRICE_INR}</span>
              ) : null}
              <span className="text-amber-400">₹{PRO_PRICE_INR}</span>
              <span className="text-xs font-bold text-slate-400">/ month</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Pay by UPI, then enter the transaction number. Pro is activated for {PRO_PERIOD_DAYS} days
              after we confirm your payment. Renew the same way each month.
            </p>
          </div>

          {!signedIn ? (
            <div className="text-center space-y-3 py-4">
              <p className="text-sm text-slate-300">Sign in first so we can activate Pro on your account.</p>
              <button
                onClick={() => {
                  onClose();
                  onRequireAuth();
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm"
              >
                Sign In
              </button>
            </div>
          ) : !UPI_ID ? (
            <p className="text-sm text-red-300">UPI is not configured yet. Please try again later.</p>
          ) : (
            <>
              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 text-center space-y-3">
                <p className="text-[11px] font-bold uppercase text-slate-400">Step 1 — Pay ₹{PRO_PRICE_INR}</p>
                <img
                  src={qrUrl}
                  alt="UPI QR code"
                  width={200}
                  height={200}
                  className="mx-auto rounded-lg bg-white p-1"
                />
                <p className="text-sm font-bold text-white">{UPI_NAME}</p>
                <button
                  type="button"
                  onClick={copyId}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-200 hover:text-white"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {UPI_ID}
                </button>
                <a
                  href={upiLink}
                  className="md:hidden flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-amber-500 text-slate-950 font-black text-sm"
                >
                  <Smartphone className="w-4 h-4" /> Open UPI App to Pay
                </a>
              </div>

              <form onSubmit={submit} className="space-y-2">
                <p className="text-[11px] font-bold uppercase text-slate-400">
                  Step 2 — Enter UPI transaction / UTR number
                </p>
                <input
                  required
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="12-digit number from your payment app"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
                {error && <p className="text-xs text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={sending || utr.length !== 12}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm disabled:opacity-40"
                >
                  {sending ? 'Submitting...' : 'I Have Paid — Submit'}
                </button>
              </form>

              {payments.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-bold uppercase text-slate-400">Your requests</p>
                  {payments.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs"
                    >
                      <span className="text-slate-300">{p.utr}</span>
                      <span
                        className={`font-black ${
                          p.status === 'approved'
                            ? 'text-emerald-400'
                            : p.status === 'rejected'
                            ? 'text-red-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {p.status === 'pending' ? 'Waiting for confirmation' : p.status}
                      </span>
                    </div>
                  ))}
                  {hasPending && (
                    <p className="text-[11px] text-slate-400">
                      Pro is activated after we verify your payment. Refresh the page once it is approved.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
