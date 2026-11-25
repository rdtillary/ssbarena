'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SignUpScreen } from './SignUpScreen';
import { OnboardingQuiz } from './OnboardingQuiz';
import './onboarding.css';

// Legal and contact pages stay public (payment providers need to be able to read them).
const PUBLIC_PATHS = ['/privacy', '/terms', '/refund-policy', '/contact'];

/** Login is compulsory: sign up -> quiz (once per account) -> website. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null | undefined>(undefined); // undefined = still checking
  const [quizFor, setQuizFor] = useState<{ userId: string; needed: boolean } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    // Fires once with the stored session, then on every sign in / sign out.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setQuizFor(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await createClient()
        .from('onboarding_responses')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();
      // If the check itself fails, never lock a signed-in user out.
      if (error) console.error('Quiz check failed', error);
      if (!cancelled) setQuizFor({ userId, needed: !error && !data });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (PUBLIC_PATHS.includes(pathname)) return <>{children}</>;

  if (userId === null) return <SignUpScreen />;
  if (!userId || quizFor?.userId !== userId) {
    return (
      <main className="ob">
        <p className="ob-sub" role="status">Loading SSB Arena…</p>
      </main>
    );
  }
  if (quizFor.needed) {
    return <OnboardingQuiz userId={userId} onDone={() => setQuizFor({ userId, needed: false })} />;
  }
  return <>{children}</>;
}
