import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;
const PAGE = 100;

async function people(admin: any, ids: string[]) {
  const out: Record<string, { email: string; name: string }> = {};
  if (!ids.length) return out;
  const { data } = await admin.from('profiles').select('id, email, full_name').in('id', ids);
  (data || []).forEach((p: any) => (out[p.id] = { email: p.email || '', name: p.full_name || '' }));
  return out;
}

// GET            -> visit stats, recording totals, first page of recordings (with full AI results), earlier signed-in attempts
// GET ?offset=N  -> next page of recordings only
export async function GET(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const admin = createAdminSupabase();
  const offset = Math.max(0, Number(new URL(req.url).searchParams.get('offset')) || 0);

  const { data: sc } = await admin.from('ppdt_scenarios').select('id, recommended_story, olq_highlights');
  const stories = new Map<number, any>((sc || []).map((s: any) => [s.id, s]));

  const { data: rows, error, count } = await admin
    .from('ppdt_recordings')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const who = await people(admin, Array.from(new Set((rows || []).map((r: any) => r.user_id).filter(Boolean))) as string[]);
  const recordings = (rows || []).map((r: any) => ({
    id: r.id,
    source: 'recording',
    visitor_id: r.visitor_id,
    email: who[r.user_id]?.email || '',
    name: who[r.user_id]?.name || '',
    scenario_title: r.scenario_title || '',
    recommended_story: stories.get(r.scenario_id)?.recommended_story || '',
    story_olqs: stories.get(r.scenario_id)?.olq_highlights || [],
    audio_url: r.audio_url,
    transcript: r.transcript,
    main_action: r.main_action || '',
    valid: r.valid,
    story_score: r.story_score,
    narration_score: r.narration_score,
    total_score: r.total_score,
    max_score: 60,
    duration_seconds: r.duration_seconds || 0,
    result: r.result || null,
    created_at: r.created_at,
  }));

  if (offset > 0) return NextResponse.json({ recordings, total: count || 0 });

  // ---- visit stats ----
  const now = Date.now();
  const { count: totalVisits } = await admin.from('site_visits').select('id', { count: 'exact', head: true });
  const { data: recent } = await admin
    .from('site_visits')
    .select('visitor_id, created_at')
    .gte('created_at', new Date(now - 30 * DAY).toISOString())
    .order('created_at', { ascending: false })
    .limit(100000);
  const { data: allVisitors } = await admin.from('site_visits').select('visitor_id').limit(200000);
  const uniqueAll = new Set((allVisitors || []).map((v: any) => v.visitor_id)).size;

  const startToday = new Date();
  startToday.setHours(0, 0, 0, 0);
  let today = 0;
  let last7 = 0;
  const perDay: Record<string, number> = {};
  for (const v of recent || []) {
    const t = new Date(v.created_at).getTime();
    if (t >= startToday.getTime()) today++;
    if (t >= now - 7 * DAY) last7++;
    const key = new Date(t).toLocaleDateString('en-CA');
    perDay[key] = (perDay[key] || 0) + 1;
  }
  const days: { date: string; visits: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = new Date(now - i * DAY).toLocaleDateString('en-CA');
    days.push({ date: key, visits: perDay[key] || 0 });
  }

  const { data: rv } = await admin.from('ppdt_recordings').select('visitor_id').limit(100000);
  const recordingUsers = new Set((rv || []).map((r: any) => r.visitor_id)).size;

  // ---- earlier attempts (signed-in users, saved before anonymous IDs existed) ----
  const { data: first } = await admin
    .from('ppdt_recordings')
    .select('created_at')
    .order('created_at', { ascending: true })
    .limit(1);
  const cutoff = first?.[0]?.created_at || new Date(now + DAY).toISOString();
  const { data: old } = await admin
    .from('user_attempts')
    .select('id, user_id, scenario_id, scenario_title, story_score, narration_score, total_score, max_score, transcript, audio_url, payload, olq_report, created_at')
    .eq('attempt_type', 'PPDT')
    .lt('created_at', cutoff)
    .order('created_at', { ascending: false })
    .limit(300);
  const oldWho = await people(admin, Array.from(new Set((old || []).map((r: any) => r.user_id).filter(Boolean))) as string[]);
  const legacy = (old || []).map((r: any) => {
    const p = r.payload || {};
    const rep = r.olq_report;
    return {
      id: r.id,
      source: 'attempt',
      visitor_id: '',
      user_id: r.user_id,
      email: oldWho[r.user_id]?.email || 'unknown',
      name: oldWho[r.user_id]?.name || '',
      scenario_title: r.scenario_title,
      recommended_story: stories.get(r.scenario_id)?.recommended_story || '',
      story_olqs: stories.get(r.scenario_id)?.olq_highlights || [],
      audio_url: r.audio_url,
      transcript: r.transcript,
      main_action: p.mainAction || '',
      valid: true,
      story_score: r.story_score,
      narration_score: r.narration_score,
      total_score: r.total_score,
      max_score: r.max_score,
      duration_seconds: 0,
      result: {
        ...p,
        olq: p.olq || (rep?.scores ? { scores: rep.scores, remarks: rep.remarks } : undefined),
        strengths: p.strengths ?? rep?.strengths,
        improvements: p.improvements ?? rep?.improvements,
        summary: rep?.summary,
      },
      created_at: r.created_at,
    };
  });

  return NextResponse.json({
    stats: {
      totalVisits: totalVisits || 0,
      uniqueVisitors: uniqueAll,
      visitsToday: today,
      visits7d: last7,
      recordings: count || 0,
      recordingUsers,
      days,
    },
    recordings,
    legacy,
    total: count || 0,
  });
}
