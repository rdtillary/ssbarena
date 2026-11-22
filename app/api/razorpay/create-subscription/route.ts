import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { ensurePlanId, getRazorpay } from '@/lib/razorpay-sub';

export const runtime = 'nodejs';

export async function POST() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  const admin = createAdminSupabase();

  // One live subscription per account.
  const { data: existing } = await admin
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .in('status', ['authenticated', 'active', 'cancelling'])
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'You already have an active subscription on this account.' },
      { status: 409 }
    );
  }

  try {
    const rz = getRazorpay();
    const planId = await ensurePlanId(admin, rz);
    const sub = await rz.subscriptions.create({
      plan_id: planId,
      total_count: 120, // up to 10 years; the user can cancel any time
      quantity: 1,
      customer_notify: 1,
      notes: { user_id: user.id, email: user.email || '' },
    });

    await admin.from('subscriptions').insert({
      user_id: user.id,
      razorpay_subscription_id: sub.id,
      status: sub.status || 'created',
    });

    return NextResponse.json({ subscriptionId: sub.id, keyId: process.env.RAZORPAY_KEY_ID });
  } catch (err: any) {
    const msg: string = err?.error?.description || err?.message || '';
    console.error('create-subscription failed', err?.error || err);
    return NextResponse.json(
      {
        error: /not (found|enabled)|subscription/i.test(msg)
          ? 'Autopay (Subscriptions) is not enabled on this Razorpay account yet. Enable it in the Razorpay dashboard or contact Razorpay support.'
          : msg || 'Could not start the subscription. Please try again.',
      },
      { status: 502 }
    );
  }
}
