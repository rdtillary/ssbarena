import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const VID = /^[\w-]{8,64}$/;
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_PER_HOUR = 20; // per anonymous visitor, stops abuse of the public upload

const num = (v: unknown, lo: number, hi: number): number | null => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};

// multipart  -> saves the audio right after the narration ends (guest or signed in)
// JSON       -> attaches the transcript, scores and the full AI result once graded
export async function POST(req: Request) {
  const admin = createAdminSupabase();
  const ct = req.headers.get('content-type') || '';

  if (ct.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    }
    const visitor = String(form.get('visitor_id') || '');
    const audio = form.get('audio');
    if (!VID.test(visitor)) return NextResponse.json({ error: 'Bad visitor id.' }, { status: 400 });
    if (!(audio instanceof File) || audio.size < 1000) {
      return NextResponse.json({ error: 'No audio.' }, { status: 400 });
    }
    if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Audio too large.' }, { status: 400 });

    const since = new Date(Date.now() - 3600_000).toISOString();
    const { count } = await admin
      .from('ppdt_recordings')
      .select('id', { count: 'exact', head: true })
      .eq('visitor_id', visitor)
      .gte('created_at', since);
    if ((count || 0) >= MAX_PER_HOUR) return NextResponse.json({ error: 'Too many recordings.' }, { status: 429 });

    let userId: string | null = null;
    try {
      const { data } = await createServerSupabase().auth.getUser();
      userId = data?.user?.id || null;
    } catch {}

    const baseType = (audio.type || 'audio/webm').split(';')[0];
    const ext = baseType.includes('mp4') ? 'mp4' : baseType.includes('ogg') ? 'ogg' : 'webm';
    const path = `guest/${visitor}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

    let audioUrl: string | null = null;
    const up = await admin.storage
      .from('narration-audio')
      .upload(path, Buffer.from(await audio.arrayBuffer()), { contentType: baseType, upsert: false });
    if (!up.error) audioUrl = admin.storage.from('narration-audio').getPublicUrl(path).data.publicUrl;
    else console.error('recording upload failed', up.error.message);

    const { data: row, error } = await admin
      .from('ppdt_recordings')
      .insert({
        visitor_id: visitor,
        user_id: userId,
        scenario_id: num(form.get('scenario_id'), 0, 100000),
        scenario_title: String(form.get('scenario_title') || '').slice(0, 200),
        audio_url: audioUrl,
        duration_seconds: num(form.get('duration_seconds'), 0, 600) ?? 0,
        main_action: String(form.get('main_action') || '').slice(0, 300),
      })
      .select('id')
      .single();
    if (error || !row) return NextResponse.json({ error: error?.message || 'Could not save.' }, { status: 500 });
    return NextResponse.json({ id: row.id });
  }

  let b: any;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const id = String(b?.id || '');
  const visitor = String(b?.visitor_id || '');
  if (!id || !VID.test(visitor)) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const result =
    b.result && typeof b.result === 'object' && JSON.stringify(b.result).length < 200000 ? b.result : null;

  const { error } = await admin
    .from('ppdt_recordings')
    .update({
      valid: Boolean(b.valid),
      transcript: String(b.transcript || '').slice(0, 8000),
      story_score: num(b.story_score, 0, 40),
      narration_score: num(b.narration_score, 0, 20),
      total_score: num(b.total_score, 0, 60),
      result,
    })
    .eq('id', id)
    .eq('visitor_id', visitor);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
