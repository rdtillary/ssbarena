import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getRazorpay } from '@/lib/razorpay-sub';

export const runtime = 'nodejs';

const LIVE = ['authenticated', 'active', 'cancelling'];

// Current subscription state for the signed-in user.
export async function GET() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ subscription: null });

  const admin = createAdminSupabase();
  const { data } = await admin
    .from('subscriptions')
    .select('status, current_end')
    .eq('user_id', auth.user.id)
    .in('status', LIVE)
    .order('created_at', { ascending: false })
    .limit(1);
  return NextResponse.json({ subscription: data?.[0] || null });
}

// Cancel autopay. The user keeps Pro until the end of the period already paid for.
export async function POST() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  const admin = createAdminSupabase();
  const { data } = await admin
    .from('subscriptions')
    .select('razorpay_subscription_id')
    .eq('user_id', auth.user.id)
    .in('status', ['authenticated', 'active'])
    .order('created_at', { ascending: false })
    .limit(1);
  const row = data?.[0];
  if (!row) return NextResponse.json({ error: 'No active subscription found.' }, { status: 404 });

  try {
    await getRazorpay().subscriptions.cancel(row.razorpay_subscription_id, true); // true = at end of cycle
    await admin
      .from('subscriptions')
      .update({ status: 'cancelling' })
      .eq('razorpay_subscription_id', row.razorpay_subscription_id);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('cancel subscription failed', err?.error || err);
    return NextResponse.json(
      { error: err?.error?.description || 'Could not cancel. Please try again or contact us.' },
      { status: 502 }
    );
  }
}
