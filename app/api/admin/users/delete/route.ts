import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';
import { getRazorpay } from '@/lib/razorpay-sub';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'narration-audio';

// "https://x.supabase.co/storage/v1/object/public/narration-audio/guest/abc/1.webm" -> "guest/abc/1.webm"
const pathOf = (url?: string | null) => {
  const i = String(url || '').indexOf(`/${BUCKET}/`);
  return i === -1 ? null : decodeURIComponent(String(url).slice(i + BUCKET.length + 2).split('?')[0]);
};

// Permanently deletes one user and everything linked to them. Admin only.
export async function POST(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const { id } = await req.json().catch(() => ({}));
  const userId = String(id || '');
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return NextResponse.json({ error: 'Invalid user id.' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: target } = await admin.auth.admin.getUserById(userId);
  if (!target?.user) return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (adminEmail && target.user.email?.toLowerCase() === adminEmail) {
    return NextResponse.json({ error: 'The admin account cannot be deleted.' }, { status: 400 });
  }

  const notes: string[] = [];

  // 1) Stop any live Razorpay autopay so the user is never charged again.
  try {
    const { data: subs } = await admin
      .from('subscriptions')
      .select('razorpay_subscription_id')
      .eq('user_id', userId)
      .in('status', ['created', 'authenticated', 'active', 'cancelling', 'pending', 'halted', 'paused']);
    for (const s of subs || []) {
      try {
        await getRazorpay().subscriptions.cancel(s.razorpay_subscription_id, false);
      } catch (e: any) {
        notes.push(`Could not cancel subscription ${s.razorpay_subscription_id} on Razorpay (may already be ended).`);
      }
    }
  } catch {}

  // 2) Delete their audio files from storage.
  const paths = new Set<string>();
  for (const [table, col] of [
    ['ppdt_recordings', 'audio_url'],
    ['lecturette_attempts', 'audio_url'],
    ['user_attempts', 'audio_url'],
  ] as const) {
    const { data } = await admin.from(table).select(col).eq('user_id', userId).limit(10000);
    (data || []).forEach((r: any) => {
      const p = pathOf(r[col]);
      if (p) paths.add(p);
    });
  }
  const all = Array.from(paths);
  for (let i = 0; i < all.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(all.slice(i, i + 100));
    if (error) notes.push(`Some audio files could not be removed: ${error.message}`);
  }

  // 3) Delete rows that do not cascade automatically, plus a safety pass over the rest.
  for (const table of [
    'ppdt_recordings',
    'lecturette_attempts',
    'user_attempts',
    'candidate_messages',
    'referral_earnings',
    'referrals',
    'subscription_payments',
    'subscriptions',
    'upi_payments',
    'payment_orders',
    'onboarding_responses',
  ]) {
    const { error } = await admin.from(table).delete().eq('user_id', userId);
    if (error && !/does not exist|schema cache/i.test(error.message)) notes.push(`${table}: ${error.message}`);
  }
  await admin.from('profiles').delete().eq('id', userId);

  // 4) Finally remove the login account itself.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) return NextResponse.json({ error: delErr.message, notes }, { status: 400 });

  return NextResponse.json({ success: true, notes });
}
