import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slurp|curl|wget|headless/i;

// Counts one visit per browser session (the browser sends this once per session).
export async function POST(req: Request) {
  try {
    if (BOT.test(req.headers.get('user-agent') || '')) return NextResponse.json({ ok: true });
    const b = await req.json().catch(() => ({}));
    const visitor = String(b?.visitor_id || '');
    if (!/^[\w-]{8,64}$/.test(visitor)) return NextResponse.json({ ok: false }, { status: 400 });
    const path = String(b?.path || '/').slice(0, 200);
    await createAdminSupabase().from('site_visits').insert({ visitor_id: visitor, path });
  } catch {}
  return NextResponse.json({ ok: true });
}
