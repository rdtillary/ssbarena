import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const deny = () => NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
const pctOk = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
const paiseOk = (n: number) => Number.isInteger(n) && n >= 0 && n <= 1000000;

async function clickStats(admin: any) {
  const { data } = await admin.from('creator_clicks').select('creator_id, visitor_id').limit(200000);
  const total = new Map<number, number>();
  const uniq = new Map<number, Set<string>>();
  for (const c of data || []) {
    total.set(c.creator_id, (total.get(c.creator_id) || 0) + 1);
    if (!uniq.has(c.creator_id)) uniq.set(c.creator_id, new Set());
    uniq.get(c.creator_id)!.add(c.visitor_id);
  }
  return { total, uniq };
}

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
  const { total, uniq } = await clickStats(admin);

  const rows = (creators || []).map((c: any) => {
    const mine = (earns || []).filter((e: any) => e.creator_id === c.id);
    const uniqueClicks = uniq.get(c.id)?.size || 0;
    const unpaidClicks = Math.max(0, uniqueClicks - (c.clicks_paid || 0));
    const perClick = c.per_click_paise || 0;
    return {
      ...c,
      commission_pct: Number(c.commission_pct),
      per_click_paise: perClick,
      clicks: total.get(c.id) || 0,
      unique_clicks: uniqueClicks,
      unpaid_clicks: unpaidClicks,
      referred: (refs || []).filter((r: any) => r.creator_id === c.id).length,
      paying: new Set(mine.map((e: any) => e.user_id)).size,
      earned_paise: mine.reduce((s: number, e: any) => s + e.commission_paise, 0),
      pending_commission_paise: mine.filter((e: any) => e.status === 'pending').reduce((s: number, e: any) => s + e.commission_paise, 0),
      pending_click_paise: unpaidClicks * perClick,
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

    const { data: c } = await admin.from('creators').select('per_click_paise, clicks_paid').eq('id', id).single();
    const { uniq } = await clickStats(admin);
    const uniqueClicks = uniq.get(id)?.size || 0;
    const unpaid = Math.max(0, uniqueClicks - (c?.clicks_paid || 0));
    const clickPaise = unpaid * (c?.per_click_paise || 0);
    if (unpaid > 0) await admin.from('creators').update({ clicks_paid: uniqueClicks }).eq('id', id);

    const { data, error } = await admin
      .from('referral_earnings')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('creator_id', id)
      .eq('status', 'pending')
      .select('commission_paise');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    const commission = (data || []).reduce((s: number, e: any) => s + e.commission_paise, 0);
    return NextResponse.json({ paid_paise: commission + clickPaise });
  }

  const name = String(body.name || '').trim();
  const code = String(body.code || '').trim().toLowerCase();
  const pct = Number(body.commission_pct ?? 0);
  const perClick = Math.round(Number(body.per_click_rupees || 0) * 100);
  const email = String(body.email || '').trim().toLowerCase() || null;
  const instagram = String(body.instagram_handle || '').trim().replace(/^@/, '') || null;
  const notes = String(body.notes || '').trim() || null;
  if (!name) return NextResponse.json({ error: 'Creator name is required' }, { status: 400 });
  if (!/^[a-z0-9_-]{3,30}$/.test(code))
    return NextResponse.json({ error: 'Code: 3-30 letters, numbers, - or _' }, { status: 400 });
  if (!pctOk(pct)) return NextResponse.json({ error: 'Commission must be 0 to 100' }, { status: 400 });
  if (!paiseOk(perClick)) return NextResponse.json({ error: 'Per-click rate is invalid' }, { status: 400 });

  const { data, error } = await admin
    .from('creators')
    .insert({ name, code, email, commission_pct: pct, per_click_paise: perClick, instagram_handle: instagram, notes })
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
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ error: 'Missing creator' }, { status: 400 });
  const updates: Record<string, any> = {};
  if (b.commission_pct !== undefined) {
    if (!pctOk(Number(b.commission_pct))) return NextResponse.json({ error: 'Commission must be 0 to 100' }, { status: 400 });
    updates.commission_pct = Number(b.commission_pct);
  }
  if (b.per_click_rupees !== undefined) {
    const p = Math.round(Number(b.per_click_rupees) * 100);
    if (!paiseOk(p)) return NextResponse.json({ error: 'Per-click rate is invalid' }, { status: 400 });
    updates.per_click_paise = p;
  }
  if (typeof b.notes === 'string') updates.notes = b.notes.trim() || null;
  if (typeof b.active === 'boolean') updates.active = b.active;
  const admin = createAdminSupabase();
  const { error } = await admin.from('creators').update(updates).eq('id', b.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
