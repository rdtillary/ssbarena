import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';
import { generateOlqReport } from '@/lib/olq-ai';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Admin only: builds the 15-OLQ report for an older recording that was saved without one.
export async function POST(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const id = String(b?.id || '');
  if (!id) return NextResponse.json({ error: 'Missing recording.' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: row } = await admin
    .from('ppdt_recordings')
    .select('id, scenario_title, transcript, result')
    .eq('id', id)
    .single();
  if (!row) return NextResponse.json({ error: 'Recording not found.' }, { status: 404 });

  const transcript = String(row.transcript || '').trim();
  if (transcript.length < 20) {
    return NextResponse.json({ error: 'This recording has no transcript to judge.' }, { status: 422 });
  }

  try {
    const rep = await generateOlqReport({ scenarioTitle: row.scenario_title || 'PPDT', transcript });
    const prev = row.result || {};
    const result = {
      ...prev,
      olq: { scores: rep.scores, remarks: rep.remarks },
      summary: prev.summary || rep.summary,
      strengths: prev.strengths?.length ? prev.strengths : rep.strengths,
      improvements: prev.improvements?.length ? prev.improvements : rep.improvements,
    };
    const { error } = await admin.from('ppdt_recordings').update({ result }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Could not generate report.' }, { status: 502 });
  }
}
