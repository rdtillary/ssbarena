import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const PAGE = 100;

// GET            -> visit stats + PPDT totals + first page of attempts
// GET ?offset=N  -> next page of attempts only
export async function GET(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const admin = createAdminSupabase();
  const offset = Math.max(0, Number(new URL(req.url).searchParams.get('offset')) || 0);

  const { data: rows, error, count } = await admin
    .from('user_attempts')
    .select('id, user_id, scenario_id, scenario_title, story_score, narration_score, total_score, max_score, transcript, audio_url, payload, created_at', { count: 'exact' })
    .eq('attempt_type', 'PPDT')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const ids = Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean)));
  const people: Record<string, { email: string; name: string }> = {};
  if (ids.length) {
    const { data: profs } = await admin.from('profiles').select('id, email, full_name').in('id', ids);
    (profs || []).forEach((p: any) => (people[p.id] = { email: p.email || '', name: p.full_name || '' }));
  }
  const attempts = (rows || []).map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    email: people[r.user_id]?.email || 'unknown',
    name: people[r.user_id]?.name || '',
    scenario_title: r.scenario_title,
    story_score: r.story_score,
    narration_score: r.narration_score,
    total_score: r.total_score,
    max_score: r.max_score,
    transcript: r.transcript,
    audio_url: r.audio_url,
    main_action: r.payload?.mainAction || '',
    created_at: r.created_at,
  }));

  if (offset > 0) return NextResponse.json({ attempts, total: count || 0 });

  // Visit stats
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY).toISOString();
  const { count: totalVisits } = await admin.from('site_visits').select('id', { count: 'exact', head: true });
  const { data: recent } = await admin
    .from('site_visits')
    .select('visitor_id, created_at')
    .gte('created_at', since30)
    .order('created_at', { ascending: false })
    .limit(100000);

  const { data: allVisitors } = await admin.from('site_visits').select('visitor_id').limit(200000);
  const uniqueAll = new Set((allVisitors || []).map((v: any) => v.visitor_id)).size;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  const todayMs = startToday.getTime();
  let today = 0;
  let last7 = 0;
  const uniq7 = new Set<string>();
  const perDay: Record<string, number> = {};
  for (const v of recent || []) {
    const t = new Date(v.created_at).getTime();
    if (t >= todayMs) today++;
    if (t >= now - 7 * DAY) {
      last7++;
      uniq7.add(v.visitor_id);
    }
    const key = new Date(t).toLocaleDateString('en-CA');
    perDay[key] = (perDay[key] || 0) + 1;
  }
  const days: { date: string; visits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(now - i * DAY).toLocaleDateString('en-CA');
    days.push({ date: key, visits: perDay[key] || 0 });
  }

  // Users who attempted PPDT
  const { data: who } = await admin.from('user_attempts').select('user_id').eq('attempt_type', 'PPDT').limit(50000);
  const practisingUsers = new Set((who || []).map((w: any) => w.user_id)).size;

  return NextResponse.json({
    stats: {
      totalVisits: totalVisits || 0,
      uniqueVisitors: uniqueAll,
      visitsToday: today,
      visits7d: last7,
      uniqueVisitors7d: uniq7.size,
      ppdtAttempts: count || 0,
      practisingUsers,
      days,
    },
    attempts,
    total: count || 0,
  });
}
