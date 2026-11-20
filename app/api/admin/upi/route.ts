import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// List pending (and recent) payment requests with the user's email.
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('upi_payments')
    .select('id, user_id, utr, amount_inr, status, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = Array.from(new Set((data || []).map((p) => p.user_id)));
  const emails: Record<string, string> = {};
  if (ids.length) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ids);
    (profiles || []).forEach((p: any) => (emails[p.id] = p.email));
  }

  return NextResponse.json({
    payments: (data || []).map((p) => ({ ...p, email: emails[p.user_id] || 'unknown' })),
  });
}

// Approve (unlock lifetime Pro) or reject a request.
export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const id = Number(payload?.id);
  const action = payload?.action;
  if (!id || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: pay } = await admin.from('upi_payments').select('*').eq('id', id).single();
  if (!pay) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
  if (pay.status !== 'pending') {
    return NextResponse.json({ error: `Already ${pay.status}.` }, { status: 409 });
  }

  if (action === 'approve') {
    const { error: proErr } = await admin
      .from('profiles')
      .update({ is_pro: true, pro_expires_at: null })
      .eq('id', pay.user_id);
    if (proErr) return NextResponse.json({ error: proErr.message }, { status: 400 });
  }

  const { error } = await admin
    .from('upi_payments')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
