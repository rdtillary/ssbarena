'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AuthScreen } from '@/components/AuthScreen';
import { OnboardingQuiz } from '@/components/OnboardingQuiz';

// Pages that stay open without an account (legal pages, pricing).
const PUBLIC_PATHS = ['/terms', '/privacy', '/refund-policy', '/contact', '/pricing', '/download'];

type Status = 'loading' | 'out' | 'quiz' | 'ready';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const path = usePathname() || '/';
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
  const [supabase] = useState(() => createClient());
  const [status, setStatus] = useState<Status>('loading');
  const [userId, setUserId] = useState('');

  const evaluate = useCallback(
    async (user: { id: string } | null) => {
      if (!user) {
        setUserId('');
        setStatus('out');
        return;
      }
      setUserId(user.id);
      try {
        if (localStorage.getItem(`ssb_onb_${user.id}`)) {
          setStatus('ready');
          return;
        }
      } catch {}
      const { data, error } = await supabase
        .from('onboarding_answers')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();
      // If the table is missing, never lock people out of the site.
      if (error || data) {
        try {
          localStorage.setItem(`ssb_onb_${user.id}`, '1');
        } catch {}
        setStatus('ready');
      } else {
        setStatus('quiz');
      }
    },
    [supabase]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => evaluate(data?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return;
      setTimeout(() => evaluate(session?.user ?? null), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase, evaluate]);

  if (isPublic) return <>{children}</>;

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#070a12]">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-amber-400" />
      </div>
    );
  }
  if (status === 'out') return <AuthScreen />;
  if (status === 'quiz') return <OnboardingQuiz userId={userId} onDone={() => setStatus('ready')} />;
  return <>{children}</>;
}
