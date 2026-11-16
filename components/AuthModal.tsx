'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function AuthModal({ open, onClose, onAuthenticated }: Props) {
  const supabase = createClient();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!open) return null;

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          setMessage(error.message);
        } else if (data.user && data.user.identities && data.user.identities.length === 0) {
          // Supabase hides "already registered" by returning a user with no identities.
          setMessage('This email is already registered. Please sign in instead.');
          setIsSignUp(false);
        } else if (!data.session) {
          // "Confirm email" is enabled in Supabase: account exists but needs confirming first.
          setMessage('Account created! Check your email (and spam folder) for a confirmation link, then sign in.');
          setIsSignUp(false);
        } else {
          onAuthenticated();
          onClose();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage(
            error.message.toLowerCase().includes('email not confirmed')
              ? 'Please confirm your email first. Check your inbox (and spam) for the confirmation link.'
              : error.message
          );
        } else {
          onAuthenticated();
          onClose();
        }
      }
    } catch (err: any) {
      setMessage(err?.message || 'Could not reach the server. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setMessage('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setMessage(error.message);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-sm w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-white">
          {isSignUp ? 'Create Aspirant Account' : 'Sign In to SSB Arena'}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Save your narration recordings, AI transcripts &amp; Pro pass.
        </p>

        <button
          onClick={handleGoogle}
          type="button"
          className="w-full mt-4 py-2.5 px-4 rounded-xl bg-white text-slate-950 font-bold text-sm hover:bg-slate-100 transition"
        >
          Continue with Google
        </button>

        <div className="my-4 flex items-center gap-2 text-xs text-slate-500">
          <div className="h-px bg-slate-800 flex-1" /> OR <div className="h-px bg-slate-800 flex-1" />
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 outline-none"
          />
          <input
            type="password"
            required
            minLength={6}
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-amber-500 outline-none"
          />

          {message && <p className="text-xs text-amber-400">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="w-full text-center text-xs text-slate-400 hover:text-amber-400 mt-4"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'New here? Create a free account'}
        </button>
      </div>
    </div>
  );
}
