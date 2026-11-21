import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { generateOlqReport } from '@/lib/olq-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Returns the saved OLQ report for an attempt, generating it with AI the first time.
export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  let attemptId: string | number;
  try {
    attemptId = (await req.json())?.attempt_id;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!attemptId) return NextResponse.json({ error: 'Missing attempt.' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: attempt } = await admin
    .from('user_attempts')
    .select('id, user_id, scenario_title, transcript, olq_report')
    .eq('id', attemptId)
    .single();

  if (!attempt || attempt.user_id !== auth.user.id) {
    return NextResponse.json({ error: 'Attempt not found.' }, { status: 404 });
  }

  // Already judged: return the saved report (no extra AI cost).
  if (attempt.olq_report) {
    return NextResponse.json({ report: attempt.olq_report, scenario_title: attempt.scenario_title });
  }

  const transcript = String(attempt.transcript || '').trim();
  if (transcript.length < 20) {
    return NextResponse.json(
      { error: 'This attempt has no narration transcript to judge.' },
      { status: 422 }
    );
  }

  try {
    const report = await generateOlqReport({
      scenarioTitle: attempt.scenario_title || 'PPDT',
      transcript,
    });
    await admin.from('user_attempts').update({ olq_report: report }).eq('id', attempt.id);
    return NextResponse.json({ report, scenario_title: attempt.scenario_title });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Could not generate report.' }, { status: 502 });
  }
}
