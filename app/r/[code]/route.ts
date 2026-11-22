import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

// https://yoursite/r/<creator-code>: remembers the creator for 30 days, then opens the home page.
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = String(params.code || '').toLowerCase();
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host;
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const res = NextResponse.redirect(`${proto}://${host}/`);

  if (/^[a-z0-9_-]{3,30}$/.test(code)) {
    const admin = createAdminSupabase();
    const { data } = await admin.from('creators').select('id').eq('code', code).eq('active', true).maybeSingle();
    if (data) {
      res.cookies.set('ssb_ref', code, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }
  return res;
}
