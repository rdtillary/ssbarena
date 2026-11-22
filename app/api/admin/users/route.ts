import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// All users with their plan, activity and subscription details (admin only).
export async function GET() {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const admin = createAdminSupabase();

  // 1) Sign-up / sign-in info from Supabase Auth
  const authUsers: any[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    authUsers.push(...(data?.users || []));
    if (!data?.users || data.users.length < 1000) break;
  }

  // 2) Profiles (plan, target centre, ...)
  const { data: profiles } = await admin.from('profiles').select('*');
  const profileById = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

  // 3) Practice activity
  const { data: attempts } = await admin
    .from('user_attempts')
    .select('user_id, attempt_type, created_at, total_score, max_score')
    .order('created_at', { ascending: false })
    .limit(20000);
  const activity = new Map<string, { ppdt: number; oir: number; last: string | null }>();
  for (const a of attempts || []) {
    const cur = activity.get(a.user_id) || { ppdt: 0, oir: 0, last: null };
    if (a.attempt_type === 'PPDT') cur.ppdt++;
    else cur.oir++;
    if (!cur.last) cur.last = a.created_at; // rows are newest first
    activity.set(a.user_id, cur);
  }

  // 4) Autopay subscriptions
  const { data: subs } = await admin
    .from('subscriptions')
    .select('user_id, status, current_end, created_at')
    .order('created_at', { ascending: false });
  const subByUser = new Map<string, any>();
  for (const s of subs || []) if (!subByUser.has(s.user_id)) subByUser.set(s.user_id, s);

  const now = Date.now();
  const users = authUsers.map((u) => {
    const p = profileById.get(u.id) || {};
    const act = activity.get(u.id);
    const sub = subByUser.get(u.id);
    const expires = p.pro_expires_at ? new Date(p.pro_expires_at).getTime() : null;
    const proActive = Boolean(p.is_pro && (expires === null || expires > now));
    return {
      id: u.id,
      email: u.email || p.email || '',
      name: p.full_name || p.name || u.user_metadata?.full_name || u.user_metadata?.name || '',
      provider: u.app_metadata?.provider || '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at || null,
      email_confirmed: Boolean(u.email_confirmed_at),
      plan: proActive ? (expires === null ? 'Lifetime' : 'Pro') : 'Free',
      pro_expires_at: p.pro_expires_at || null,
      subscription_status: sub?.status || null,
      subscription_end: sub?.current_end || null,
      ppdt_attempts: act?.ppdt || 0,
      oir_attempts: act?.oir || 0,
      last_attempt_at: act?.last || null,
      target_board: p.target_board || null,
      reporting_date: p.reporting_date || null,
    };
  });

  users.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  return NextResponse.json({ users });
}
