import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PRO_PRICE_INR } from '@/lib/config';

const MIN_AMOUNT_PAISE = 100;

export async function POST() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: 'Payments are not configured on the server.' }, { status: 500 });
  }

  const amountPaise = Math.round(PRO_PRICE_INR * 100);
  if (!Number.isFinite(amountPaise) || amountPaise < MIN_AMOUNT_PAISE) {
    return NextResponse.json({ error: 'Invalid amount (minimum is 100 paise).' }, { status: 400 });
  }

  let order;
  try {
    const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `ssb_${Date.now()}`,
    });
  } catch (err: any) {
    console.error('Razorpay order creation failed', err?.statusCode, err?.error || err);
    if (err?.statusCode === 401) {
      return NextResponse.json({ error: 'Razorpay authentication failed. Check the API keys.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Could not create the payment order. Please try again.' }, { status: 500 });
  }

  const admin = createAdminSupabase();
  const { error: insertError } = await admin.from('payment_orders').insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount_paise: amountPaise,
    status: 'created',
  });
  if (insertError) {
    console.error('Saving payment order failed', insertError.message);
    return NextResponse.json({ error: 'Could not save the payment order. Please try again.' }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    amount: amountPaise,
    currency: 'INR',
    keyId,
  });
}
