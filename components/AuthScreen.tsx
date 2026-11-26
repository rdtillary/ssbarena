'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/Logo';
import { GATE_CSS } from '@/components/gate-styles';

// Mobile numbers sign in through a private address of this form (no SMS provider needed).
export const PHONE_DOMAIN = 'phone.ssbarena.in';

type Parsed = { email: string; phone?: string } | { error: string };

function parseIdentifier(raw: string): Parsed {
  const v = raw.trim();
  if (!v) return { error: 'Enter your email or mobile number.' };
  if (v.includes('@')) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
      ? { email: v.toLowerCase() }
      : { error: 'That email does not look right.' };
  }
  let d = v.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return { error: 'Enter a valid 10-digit mobile number.' };
  return { email: `${d}@${PHONE_DOMAIN}`, phone: d };
}

export function AuthScreen() {
  const supabase = createClient();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const looksLikePhone = /^[\d\s+-]+$/.test(identifier.trim()) && identifier.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    const p = parseIdentifier(identifier);
    if ('error' in p) {
      setMessage(p.error);
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: p.email,
          password,
          options: p.phone ? { data: { phone: p.phone } } : undefined,
        });
        if (error) {
          if (/already|registered|exists/i.test(error.message)) {
            setMessage('This account already exists. Please log in.');
            setMode('login');
          } else setMessage(error.message);
        } else if (!data.session) {
          const r = await supabase.auth.signInWithPassword({ email: p.email, password });
          if (r.error) {
            setMessage('Account created. Please log in.');
            setMode('login');
          }
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: p.email, password });
        if (error) {
          setMessage(
            /invalid/i.test(error.message)
              ? 'Wrong email/mobile or password. New here? Choose Sign up.'
              : error.message
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  return (
    <div className="gt-root">
      <style>{GATE_CSS}</style>
      <div className="gt-grain" />
      <div className="gt-orb" style={{ width: 360, height: 360, left: '-8%', top: '8%', background: '#f59e0b' }} />
      <div className="gt-orb" style={{ width: 320, height: 320, right: '-6%', bottom: '6%', background: '#38bdf8', animationDelay: '-6s' }} />

      <div className="relative mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="gt-in mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="gt-in gt-glass rounded-[28px] p-7 sm:p-8" style={{ animationDelay: '120ms' }}>
          <p className="gt-eyebrow">{mode === 'signup' ? 'Join the arena' : 'Welcome back'}</p>
          <h1 className="gt-serif mt-2 text-[34px] leading-[1.08] text-white">
            {mode === 'signup' ? 'Your SSB journey starts here.' : 'Back to your practice.'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign up with your email or mobile number to practise PPDT and OIR under real timers.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="gt-label" htmlFor="gt-id">Email or mobile number</label>
              <div className="relative">
                {looksLikePhone && (
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400">
                    +91
                  </span>
                )}
                <input
                  id="gt-id"
                  className="gt-input"
                  style={looksLikePhone ? { paddingLeft: 52 } : undefined}
                  autoComplete="username"
                  inputMode="email"
                  placeholder="you@email.com or 98765 43210"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="gt-label" htmlFor="gt-pw">Password</label>
              <input
                id="gt-pw"
                type="password"
                className="gt-input"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && <p className="text-sm font-semibold text-amber-300">{message}</p>}

            <button type="submit" className="gt-btn" disabled={loading}>
              {loading ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Log in'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] font-bold tracking-widest text-slate-500">
            <div className="h-px flex-1 bg-slate-700/60" /> OR <div className="h-px flex-1 bg-slate-700/60" />
          </div>

          <button type="button" className="gt-ghost" onClick={google}>
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signup' ? 'login' : 'signup');
              setMessage('');
            }}
            className="mt-5 w-full text-center text-sm text-slate-400 hover:text-amber-400"
          >
            {mode === 'signup' ? 'Already have an account? Log in' : 'New here? Create an account'}
          </button>
        </div>

        <p className="gt-in mt-6 text-center text-[11px] text-slate-500" style={{ animationDelay: '260ms' }}>
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline hover:text-amber-400">Terms</Link> and{' '}
          <Link href="/privacy" className="underline hover:text-amber-400">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
