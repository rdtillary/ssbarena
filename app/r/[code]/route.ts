import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slurp|curl|wget|headless/i;

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = String(params.code || '').toLowerCase();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const res = NextResponse.redirect(`${proto}://${host}/`);

  if (/^[a-z0-9_-]{3,30}$/.test(code)) {
    const admin = createAdminSupabase();
    const { data } = await admin.from('creators').select('id').eq('code', code).eq('active', true).maybeSingle();
    if (data) {
      const secure = process.env.NODE_ENV === 'production';
      res.cookies.set('ssb_ref', code, { maxAge: 60 * 60 * 24 * 30, path: '/', sameSite: 'lax', httpOnly: true, secure });

      const ua = req.headers.get('user-agent') || '';
      if (!BOT.test(ua)) {
        const cookie = req.headers.get('cookie') || '';
        let vid = /(?:^|;\s*)ssb_vid=([\w-]+)/.exec(cookie)?.[1];
        if (!vid) {
          vid = crypto.randomUUID();
          res.cookies.set('ssb_vid', vid, { maxAge: 60 * 60 * 24 * 365, path: '/', sameSite: 'lax', httpOnly: true, secure });
        }
        try {
          await admin.from('creator_clicks').insert({ creator_id: data.id, visitor_id: vid });
        } catch {}
      }
    }
  }
  return res;
}
