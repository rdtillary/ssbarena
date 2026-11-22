import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const NEW_ACCOUNT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;

export async function POST() {
  const res = NextResponse.json({ claimed: false });
  const code = cookies().get('ssb_ref')?.value?.toLowerCase();
  if (!code) return res;

  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return res;

  res.cookies.set('ssb_ref', '', { maxAge: 0, path: '/' });

  const created = user.created_at ? new Date(user.created_at).getTime() : 0;
  if (Date.now() - created > NEW_ACCOUNT_WINDOW_MS) return res;

  const admin = createAdminSupabase();
  const { data: creator } = await admin
    .from('creators')
    .select('id, email, active')
    .eq('code', code)
    .maybeSingle();
  if (!creator || !creator.active) return res;
  if (creator.email && user.email && creator.email.toLowerCase() === user.email.toLowerCase()) return res;

  const { error } = await admin
    .from('referrals')
    .upsert({ user_id: user.id, creator_id: creator.id }, { onConflict: 'user_id', ignoreDuplicates: true });
  return error ? res : NextResponse.json({ claimed: true }, { headers: res.headers });
}
