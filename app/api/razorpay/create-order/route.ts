import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;

  if (!user) {
    return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
  }

  const priceInr = Number(process.env.NEXT_PUBLIC_PRO_PRICE_INR || 99);
  const amountPaise = priceInr * 100;

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  const order = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: `ssb_${Date.now()}`,
  });

  const admin = createAdminSupabase();
  await admin.from('payment_orders').insert({
    user_id: user.id,
    razorpay_order_id: order.id,
    amount_paise: amountPaise,
    status: 'created',
  });

  return NextResponse.json({
    orderId: order.id,
    amount: amountPaise,
    keyId: process.env.RAZORPAY_KEY_ID,
  });
}
