import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';
import { attemptToResult } from '@/lib/result-shape';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Everything about one user, A to Z (admin only).
export async function GET(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const id = new URL(req.url).searchParams.get('user_id') || '';
  if (!id) return NextResponse.json({ error: 'Missing user' }, { status: 400 });

  const admin = createAdminSupabase();
  const byNewest = { ascending: false } as const;

  const [au, prof, onb, att, rec, subs, upi, orders, ref, msgs] = await Promise.all([
    admin.auth.admin.getUserById(id),
    admin.from('profiles').select('*').eq('id', id).maybeSingle(),
    admin.from('onboarding_answers').select('*').eq('user_id', id).maybeSingle(),
    admin.from('user_attempts').select('*').eq('user_id', id).order('created_at', byNewest).limit(500),
    admin
      .from('ppdt_recordings')
      .select(
        'id, visitor_id, scenario_title, audio_url, duration_seconds, main_action, transcript, valid, story_score, narration_score, total_score, created_at'
      )
      .eq('user_id', id)
      .order('created_at', byNewest)
      .limit(500),
    admin.from('subscriptions').select('*').eq('user_id', id).order('created_at', byNewest),
    admin.from('upi_payments').select('*').eq('user_id', id).order('created_at', byNewest),
    admin.from('payment_orders').select('*').eq('user_id', id).order('created_at', byNewest),
    admin.from('referrals').select('created_at, creators(name, code)').eq('user_id', id).maybeSingle(),
    admin.from('candidate_messages').select('id', { count: 'exact', head: true }).eq('user_id', id),
  ]);

  const attempts: any[] = att.data || [];
  const recs: any[] = rec.data || [];
  const used = new Set<string>();
  const near = (a: string, b: string) => Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 20 * 60 * 1000;

  // One entry per PPDT practice. Saved attempts carry the full result; a recording with no
  // matching attempt (e.g. the save failed) is still listed with its transcript and scores.
  const sessions: any[] = [];
  for (const a of attempts.filter((x) => x.attempt_type === 'PPDT')) {
    const m = recs.find((r) => !used.has(r.id) && r.scenario_title === a.scenario_title && near(r.created_at, a.created_at));
    if (m) used.add(m.id);
    sessions.push({
      source: 'attempt',
      id: a.id,
      scenario_title: a.scenario_title,
      created_at: a.created_at,
      audio_url: a.audio_url || m?.audio_url || null,
      transcript: a.transcript,
      main_action: a.payload?.mainAction || m?.main_action || '',
      duration_seconds: m?.duration_seconds || 0,
      story_score: a.story_score,
      narration_score: a.narration_score,
      total_score: a.total_score,
      max_score: a.max_score || 60,
      valid: true,
      result: attemptToResult(a),
    });
  }
  for (const r of recs) {
    if (used.has(r.id)) continue;
    sessions.push({
      source: 'recording',
      id: r.id,
      scenario_title: r.scenario_title,
      created_at: r.created_at,
      audio_url: r.audio_url,
      transcript: r.transcript,
      main_action: r.main_action || '',
      duration_seconds: r.duration_seconds || 0,
      story_score: r.story_score,
      narration_score: r.narration_score,
      total_score: r.total_score,
      max_score: 60,
      valid: r.valid,
      result: null,
    });
  }
  sessions.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const oir = attempts
    .filter((x) => x.attempt_type === 'OIR')
    .map((x) => ({ id: x.id, title: x.scenario_title, score: x.total_score, max: x.max_score, created_at: x.created_at }));

  const wat = attempts
    .filter((x) => x.attempt_type === 'WAT')
    .map((x) => ({
      id: x.id,
      title: x.scenario_title,
      created_at: x.created_at,
      mode: x.payload?.mode || '',
      answered: x.total_score,
      total: x.max_score,
      responses: x.payload?.responses || [],
    }));

  const u: any = au.data?.user || {};
  return NextResponse.json({
    account: {
      id,
      email: u.email || '',
      phone: u.phone || u.user_metadata?.phone || '',
      provider: u.app_metadata?.provider || '',
      created_at: u.created_at || null,
      last_sign_in_at: u.last_sign_in_at || null,
      email_confirmed: Boolean(u.email_confirmed_at),
    },
    profile: prof.data || null,
    onboarding: onb.data || null,
    subscriptions: subs.data || [],
    upi_payments: upi.data || [],
    orders: orders.data || [],
    referral: ref.data || null,
    message_count: msgs.count || 0,
    sessions,
    oir,
    wat,
  });
}
