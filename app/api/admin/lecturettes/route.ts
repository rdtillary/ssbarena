import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGE = 100;

export async function GET(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const admin = createAdminSupabase();
  const offset = Math.max(0, Number(new URL(req.url).searchParams.get('offset')) || 0);

  const { data: rows, error, count } = await admin
    .from('lecturette_attempts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)));
  const who: Record<string, { email: string; name: string }> = {};
  if (ids.length) {
    const { data } = await admin.from('profiles').select('id, email, full_name').in('id', ids);
    (data || []).forEach((p: any) => (who[p.id] = { email: p.email || '', name: p.full_name || '' }));
  }

  const attempts = (rows || []).map((r: any) => ({
    ...r,
    email: who[r.user_id]?.email || 'unknown',
    name: who[r.user_id]?.name || '',
  }));

  let stats;
  if (offset === 0) {
    const { data: all } = await admin.from('lecturette_attempts').select('user_id, valid').limit(100000);
    stats = {
      total: count || 0,
      valid: (all || []).filter((a: any) => a.valid).length,
      users: new Set((all || []).map((a: any) => a.user_id).filter(Boolean)).size,
    };
  }
  return NextResponse.json({ attempts, total: count || 0, stats });
}
