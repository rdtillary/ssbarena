import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { grantLifetime, grantProPeriod, paidUntil, setProUntil } from '@/lib/pro';
import { recordCommission } from '@/lib/referral';

export const runtime = 'nodejs';

const STATUS_BY_EVENT: Record<string, string> = {
  'subscription.authenticated': 'authenticated',
  'subscription.activated': 'active',
  'subscription.charged': 'active',
  'subscription.pending': 'pending',
  'subscription.halted': 'halted',
  'subscription.cancelled': 'cancelled',
  'subscription.completed': 'completed',
  'subscription.paused': 'paused',
  'subscription.resumed': 'active',
};

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (expected !== signature) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const event = JSON.parse(rawBody);
  const admin = createAdminSupabase();

  // One-time orders (kept for any older checkout).
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const { data: claimed } = await admin
      .from('payment_orders')
      .update({ status: 'paid', razorpay_payment_id: payment.id })
      .eq('razorpay_order_id', payment.order_id)
      .or('status.is.null,status.neq.paid')
      .select('user_id');

    // Subscription charges have no row here, so they are skipped.
    const { data: order, error: orderErr } = await admin
      .from('payment_orders')
      .select('user_id, plan')
      .eq('razorpay_order_id', payment.order_id)
      .maybeSingle();
    if (orderErr) return NextResponse.json({ error: orderErr.message }, { status: 500 });

    if (order?.plan === 'lifetime' && order.user_id) {
      await grantLifetime(admin, order.user_id, payment.order_id);
      await recordCommission(admin, order.user_id, payment.id, payment.amount);
    } else if (claimed && claimed.length > 0 && claimed[0].user_id) {
      await grantProPeriod(admin, claimed[0].user_id);
      await recordCommission(admin, claimed[0].user_id, payment.id, payment.amount);
    }
  }

  // Autopay subscription events.
  const subEntity = event.payload?.subscription?.entity;
  if (typeof event.event === 'string' && event.event.startsWith('subscription.') && subEntity?.id) {
    const { data: row } = await admin
      .from('subscriptions')
      .select('user_id, status')
      .eq('razorpay_subscription_id', subEntity.id)
      .maybeSingle();
    const userId: string | undefined = row?.user_id || subEntity.notes?.user_id;

    if (userId) {
      const newStatus = STATUS_BY_EVENT[event.event];
      if (newStatus) {
        // Keep "cancelling" until Razorpay confirms the cancellation at period end.
        const keep = row?.status === 'cancelling' && newStatus === 'active';
        await admin
          .from('subscriptions')
          .update({
            ...(keep ? {} : { status: newStatus }),
            current_end: subEntity.current_end ? new Date(subEntity.current_end * 1000).toISOString() : null,
          })
          .eq('razorpay_subscription_id', subEntity.id);
      }

      // Every successful monthly charge extends Pro (once per payment).
      if (event.event === 'subscription.charged') {
        const paymentEntity = event.payload?.payment?.entity;
        const paymentId: string | undefined = paymentEntity?.id;
        if (paymentId) {
          const { error: claimErr } = await admin.from('subscription_payments').insert({
            razorpay_payment_id: paymentId,
            razorpay_subscription_id: subEntity.id,
            user_id: userId,
          });
          if (!claimErr) {
            await setProUntil(admin, userId, paidUntil(subEntity.current_end));
            await recordCommission(admin, userId, paymentId, paymentEntity?.amount);
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
