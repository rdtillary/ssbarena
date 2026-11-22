import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getRazorpay } from '@/lib/razorpay-sub';
import { paidUntil, setProUntil } from '@/lib/pro';

export const runtime = 'nodejs';

// Called by the checkout right after the first payment, so Pro turns on instantly.
export async function POST(req: Request) {
  const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = await req.json();
  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_payment_id}|${razorpay_subscription_id}`)
    .digest('hex');
  if (expected !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from('subscriptions')
    .select('user_id')
    .eq('razorpay_subscription_id', razorpay_subscription_id)
    .maybeSingle();
  if (!row || row.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Subscription does not belong to this account' }, { status: 403 });
  }

  // Each payment grants access once (the webhook may report the same payment).
  const { error: claimErr } = await admin.from('subscription_payments').insert({
    razorpay_payment_id,
    razorpay_subscription_id,
    user_id: auth.user.id,
  });
  if (claimErr && (claimErr as any).code !== '23505') {
    return NextResponse.json({ error: claimErr.message }, { status: 400 });
  }
  if (claimErr) return NextResponse.json({ success: true }); // already processed

  let currentEnd: number | null = null;
  try {
    const sub = await getRazorpay().subscriptions.fetch(razorpay_subscription_id);
    currentEnd = sub?.current_end ?? null;
    await admin
      .from('subscriptions')
      .update({
        status: sub?.status || 'active',
        current_end: currentEnd ? new Date(currentEnd * 1000).toISOString() : null,
      })
      .eq('razorpay_subscription_id', razorpay_subscription_id);
  } catch (err) {
    console.error('subscriptions.fetch failed', err);
  }

  await setProUntil(admin, auth.user.id, paidUntil(currentEnd));
  return NextResponse.json({ success: true });
}
