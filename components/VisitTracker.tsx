'use client';

import { useEffect } from 'react';

// Sends one anonymous "visit" per browser session.
export function VisitTracker() {
  useEffect(() => {
    try {
      if (window.location.pathname.startsWith('/admin')) return;
      if (sessionStorage.getItem('ssb_visit_logged')) return;
      let id = localStorage.getItem('ssb_visitor_id');
      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('ssb_visitor_id', id);
      }
      sessionStorage.setItem('ssb_visit_logged', '1');
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: id, path: window.location.pathname }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, []);
  return null;
}
