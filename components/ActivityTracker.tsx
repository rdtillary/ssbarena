'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dayKey } from '@/lib/streak';

// Records one login day per signed-in user, for the profile streak.
export function ActivityTracker() {
  useEffect(() => {
    const supabase = createClient();
    let done = '';
    const record = async () => {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) return;
      const key = `${userId}:${dayKey(new Date())}`;
      if (done === key) return;
      const { error } = await supabase.rpc('record_activity');
      if (!error) done = key;
    };
    record();
    // Deferred: calling Supabase inside the auth callback itself can deadlock.
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(record, 0);
    });
    document.addEventListener('visibilitychange', record);
    return () => {
      sub.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', record);
    };
  }, []);
  return null;
}
