import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
  }

  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
  }

  const admin = createAdminSupabase();

  // Only the user who created this order may claim the pass it paid for.
  const { data: order } = await admin
    .from('payment_orders')
    .select('user_id')
    .eq('razorpay_order_id', razorpay_order_id)
    .single();
  if (!order || order.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Order does not belong to this account' }, { status: 403 });
  }

  await admin
    .from('payment_orders')
    .update({ status: 'paid', razorpay_payment_id })
    .eq('razorpay_order_id', razorpay_order_id);

  // Lifetime pass: no expiry.
  await admin
    .from('profiles')
    .update({ is_pro: true, pro_expires_at: null })
    .eq('id', auth.user.id);

  return NextResponse.json({ success: true });
}
