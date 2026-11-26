'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toLoginEmail } from '@/lib/login-id';
import { Logo } from '@/components/Logo';

export function SignUpScreen() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = toLoginEmail(loginId);
    if (!email) {
      setMessage('Enter a valid mobile number or email address.');
      return;
    }
    setLoading(true);
    setMessage('');
    const supabase = createClient();
    const { data, error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      if (/already registered/i.test(error.message)) {
        setIsSignUp(false);
        setMessage('You already have an account. Enter your password to sign in.');
      } else if (/invalid login credentials/i.test(error.message)) {
        setMessage('Wrong mobile/email or password.');
      } else {
        setMessage(error.message);
      }
    } else if (!data.session) {
      setMessage('Account created, but email confirmation is still on in Supabase.');
    }
    // On success AuthGate notices the new session and moves on.
  };

  const google = async () => {
    await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  };

  return (
    <main className="ob">
      <div className="ob-card ob-in">
        <div className="ob-brand"><Logo /></div>
        <h1 className="ob-title">{isSignUp ? 'Create your account' : 'Welcome back'}</h1>
        <p className="ob-sub">
          {isSignUp ? 'Sign up to start your SSB practice.' : 'Sign in to continue your practice.'}
        </p>

        <form onSubmit={submit}>
          <label className="ob-field">
            <span className="ob-label">Mobile number / Email</span>
            <input
              className="ob-input"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              placeholder="9876543210 or you@mail.com"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
            />
          </label>
          <label className="ob-field">
            <span className="ob-label">Password</span>
            <input
              className="ob-input"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {message && <p className="ob-error" role="alert">{message}</p>}
          <button className="ob-button" type="submit" disabled={loading}>
            {loading ? 'Please wait…' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="ob-or">OR</div>
        <button className="ob-button plain" type="button" onClick={google}>Continue with Google</button>
        <button
          className="ob-link"
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setMessage('');
          }}
        >
          {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </main>
  );
}
