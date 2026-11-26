'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthModal } from '@/components/AuthModal';
import { ContactCadetModal } from '@/components/ContactCadetModal';

export function FloatingContact() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setSignedIn(Boolean(data?.user));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setSignedIn(Boolean(session?.user));
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  // Hidden on WAT and TAT drills so it never covers the word or the Next button.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/wat') || pathname?.startsWith('/tat')) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Contact Recommended Candidates"
        title="Contact Recommended Candidates"
        className="fab-contact group fixed z-40 right-4 bottom-[72px] md:bottom-6 md:right-6 w-14 h-14 rounded-full flex items-center justify-center text-slate-950 hover:scale-105 active:scale-95"
      >
        <MessageCircle className="w-6 h-6 relative" strokeWidth={2.4} />
        <span className="pointer-events-none absolute right-16 whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-900 border border-amber-500/40 text-amber-300 text-xs font-bold opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition hidden md:block">
          Contact Recommended Candidates
        </span>
      </button>

      <ContactCadetModal
        open={open}
        onClose={() => setOpen(false)}
        signedIn={signedIn}
        onRequireAuth={() => {
          setOpen(false);
          setAuthOpen(true);
        }}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onAuthenticated={() => {
          setAuthOpen(false);
          setSignedIn(true);
        }}
      />
    </>
  );
}
