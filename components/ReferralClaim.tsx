'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// Links a newly signed-up account to the creator whose /r/<code> link it came through.
export function ReferralClaim() {
  useEffect(() => {
    const supabase = createClient();
    const claim = () => fetch('/api/referral/claim', { method: 'POST' }).catch(() => {});
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) claim();
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') claim();
    });
    return () => sub.subscription.unsubscribe();
  }, []);
  return null;
}
