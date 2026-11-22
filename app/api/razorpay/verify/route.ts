import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { grantProPeriod } from '@/lib/pro';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body || {};

  if (
    typeof razorpay_order_id !== 'string' ||
    typeof razorpay_payment_id !== 'string' ||
    typeof razorpay_signature !== 'string' ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return NextResponse.json({ error: 'Missing payment details' }, { status: 400 });
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    return NextResponse.json({ error: 'Payments are not configured on the server.' }, { status: 500 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  const a = Buffer.from(expectedSignature);
  const b = Buffer.from(razorpay_signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
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

  // Mark paid and grant Pro only once per order (the webhook may also arrive).
  const { data: claimed } = await admin
    .from('payment_orders')
    .update({ status: 'paid', razorpay_payment_id })
    .eq('razorpay_order_id', razorpay_order_id)
    .or('status.is.null,status.neq.paid')
    .select('user_id');

  if (claimed && claimed.length > 0) {
    await grantProPeriod(admin, auth.user.id);
  }

  return NextResponse.json({ success: true });
}
