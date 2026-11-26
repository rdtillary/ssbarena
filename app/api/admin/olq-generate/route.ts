import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';
import { generateOlqReport } from '@/lib/olq-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Admin: build the 15-OLQ report for an older attempt that was saved without one.
export async function POST(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { kind, id } = await req.json().catch(() => ({}));
  if (!id || (kind !== 'attempt' && kind !== 'recording')) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
  const admin = createAdminSupabase();
  const table = kind === 'attempt' ? 'user_attempts' : 'ppdt_recordings';
  const { data: row } = await admin.from(table).select('id, scenario_title, transcript').eq('id', id).maybeSingle();
  const transcript = String(row?.transcript || '').trim();
  if (!row || transcript.length < 20) {
    return NextResponse.json({ error: 'No transcript to judge.' }, { status: 422 });
  }
  try {
    const report = await generateOlqReport({ scenarioTitle: row.scenario_title || 'PPDT', transcript });
    if (kind === 'attempt') await admin.from('user_attempts').update({ olq_report: report }).eq('id', id);
    return NextResponse.json({ report });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not generate report.' }, { status: 502 });
  }
}
