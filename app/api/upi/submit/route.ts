import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { PRO_PRICE_INR } from '@/lib/config';

export const runtime = 'nodejs';

// The signed-in user's own payment requests (so the modal can show status).
export async function GET() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  const admin = createAdminSupabase();
  const { data } = await admin
    .from('upi_payments')
    .select('id, utr, status, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(10);
  return NextResponse.json({ payments: data || [] });
}

// Submit a UTR after paying by UPI.
export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  let utr = '';
  try {
    utr = String((await req.json())?.utr ?? '').replace(/\s+/g, '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  // UPI reference numbers (UTR / UPI Ref No.) are 12 digits.
  if (!/^\d{12}$/.test(utr)) {
    return NextResponse.json(
      { error: 'Enter the 12-digit UPI transaction / UTR number from your payment app.' },
      { status: 400 }
    );
  }

  const admin = createAdminSupabase();

  const { count } = await admin
    .from('upi_payments')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('status', 'pending');
  if ((count || 0) >= 3) {
    return NextResponse.json(
      { error: 'You already have pending requests. Please wait for approval.' },
      { status: 429 }
    );
  }

  const { data, error } = await admin
    .from('upi_payments')
    .insert({ user_id: auth.user.id, utr, amount_inr: PRO_PRICE_INR })
    .select('id, utr, status, created_at')
    .single();

  if (error) {
    if ((error as any).code === '23505') {
      return NextResponse.json({ error: 'This transaction number has already been submitted.' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ payment: data });
}
