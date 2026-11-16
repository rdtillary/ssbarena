import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminSupabase } from '@/lib/supabase/admin';

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

    const { data: orderRow } = await admin
      .from('payment_orders')
      .update({ status: 'paid', razorpay_payment_id: payment.id })
      .eq('razorpay_order_id', orderId)
      .select('user_id')
      .single();

    if (orderRow?.user_id) {
      await admin
        .from('profiles')
        .update({ is_pro: true, pro_expires_at: null })
        .eq('id', orderRow.user_id);
    }
  }

  return NextResponse.json({ received: true });
}
