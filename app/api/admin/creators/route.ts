import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
const pctOk = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;

export async function GET() {
  if (!(await verifyAdmin())) return deny();
  const admin = createAdminSupabase();

  const { data: creators, error } = await admin.from('creators').select('*').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const { data: refs } = await admin.from('referrals').select('creator_id');
  const { data: earns } = await admin
    .from('referral_earnings')
    .select('creator_id, user_id, commission_paise, status')
    .limit(50000);

  const rows = (creators || []).map((c: any) => {
    const mine = (earns || []).filter((e: any) => e.creator_id === c.id);
    return {
      ...c,
      commission_pct: Number(c.commission_pct),
      referred: (refs || []).filter((r: any) => r.creator_id === c.id).length,
      paying: new Set(mine.map((e: any) => e.user_id)).size,
      earned_paise: mine.reduce((s: number, e: any) => s + e.commission_paise, 0),
      pending_paise: mine.filter((e: any) => e.status === 'pending').reduce((s: number, e: any) => s + e.commission_paise, 0),
    };
  });
  return NextResponse.json({ creators: rows });
}

// action: "create" | "payout"
export async function POST(req: Request) {
  if (!(await verifyAdmin())) return deny();
  const body = await req.json().catch(() => ({}));
  const admin = createAdminSupabase();

  if (body.action === 'payout') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'Missing creator' }, { status: 400 });
    const { data, error } = await admin
      .from('referral_earnings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('creator_id', id)
      .eq('status', 'pending')
      .select('commission_paise');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const total = (data || []).reduce((s: number, e: any) => s + e.commission_paise, 0);
    return NextResponse.json({ paid_paise: total });
  }

  const name = String(body.name || '').trim();
  const code = String(body.code || '').trim().toLowerCase();
  const pct = Number(body.commission_pct);
  const email = String(body.email || '').trim().toLowerCase() || null;
  if (!name) return NextResponse.json({ error: 'Creator name is required' }, { status: 400 });
  if (!/^[a-z0-9_-]{3,30}$/.test(code))
    return NextResponse.json({ error: 'Code: 3-30 letters, numbers, - or _' }, { status: 400 });
  if (!pctOk(pct)) return NextResponse.json({ error: 'Commission must be 0 to 100' }, { status: 400 });

  const { data, error } = await admin
    .from('creators')
    .insert({ name, code, email, commission_pct: pct })
    .select()
    .single();
  if (error)
    return NextResponse.json(
      { error: error.code === '23505' ? 'That code is already taken' : error.message },
      { status: 400 }
    );
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) return deny();
  const { id, commission_pct, active } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: 'Missing creator' }, { status: 400 });
  const updates: Record<string, any> = {};
  if (commission_pct !== undefined) {
    if (!pctOk(Number(commission_pct))) return NextResponse.json({ error: 'Commission must be 0 to 100' }, { status: 400 });
    updates.commission_pct = Number(commission_pct);
  }
  if (typeof active === 'boolean') updates.active = active;
  const admin = createAdminSupabase();
  const { error } = await admin.from('creators').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
