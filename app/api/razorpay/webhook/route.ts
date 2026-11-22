import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { grantProPeriod } from '@/lib/pro';

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
  if (event.event === 'payment.captured') {
    const payment = event.payload.payment.entity;
    const orderId = payment.order_id;
    const admin = createAdminSupabase();

    // Mark paid and grant Pro only once per order (the checkout may already have done it).
    const { data: claimed } = await admin
      .from('payment_orders')
      .update({ status: 'paid', razorpay_payment_id: payment.id })
      .eq('razorpay_order_id', orderId)
      .or('status.is.null,status.neq.paid')
      .select('user_id');

    if (claimed && claimed.length > 0 && claimed[0].user_id) {
      await grantProPeriod(admin, claimed[0].user_id);
    }
  }

  return NextResponse.json({ received: true });
}
