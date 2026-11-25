import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { getTopic } from '@/lib/lecturette-topics';
import { analyseWords, flat, STT_PROMPT, transcribe, type RawWord } from '@/lib/speech-analysis';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const VID = /^[\w-]{8,64}$/;

// Receives the lecturette audio, transcribes it, saves everything, returns the transcript + fumbles.
export async function POST(req: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Transcription is not set up yet. Add GROQ_API_KEY on the server.' }, { status: 503 });
  }

  const { data: auth } = await createServerSupabase().auth.getUser();
  const user = auth?.user;
  if (!user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
  }
  const audio = form.get('audio');
  const topic = getTopic(Number(form.get('topic_id')));
  const duration = Math.min(600, Math.max(0, Math.round(Number(form.get('duration_seconds')) || 0)));
  const visitorRaw = String(form.get('visitor_id') || '');
  const visitor = VID.test(visitorRaw) ? visitorRaw : null;
  if (!topic) return NextResponse.json({ error: 'Unknown topic.' }, { status: 400 });
  if (!(audio instanceof File) || audio.size < 3000) {
    return NextResponse.json({ error: 'No audio was recorded. Allow microphone access and try again.' }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'Audio too large.' }, { status: 400 });

  const admin = createAdminSupabase();

  // Free users get one lecturette; Pro users are unlimited.
  const { data: profile } = await admin.from('profiles').select('is_pro, pro_expires_at').eq('id', user.id).single();
  const isPro = Boolean(profile?.is_pro && (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()));
  if (!isPro) {
    const { count } = await admin
      .from('lecturette_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('valid', true);
    if ((count || 0) >= 1) {
      return NextResponse.json({ error: 'Your free lecturette is used. Upgrade to Pro for unlimited lecturettes.' }, { status: 403 });
    }
  }

  try {
    const stt = await transcribe(audio, apiKey);
    let words: RawWord[] = Array.isArray(stt.words) ? stt.words : [];
    const segments: any[] = Array.isArray(stt.segments) ? stt.segments : [];
    if (segments.length) {
      const good = segments.filter((s) => !(s.no_speech_prob > 0.6));
      words = words.filter((w) => {
        const mid = (w.start + w.end) / 2;
        return good.some((s) => mid >= s.start - 0.3 && mid <= s.end + 0.3);
      });
    }
    const joined = words.map((w) => w.word).join(' ');
    if (/^(thank you|thanks for watching|bye|you)\W*$/i.test(joined.trim()) || flat(joined).startsWith(flat(STT_PROMPT).slice(0, 40))) {
      words = [];
    }

    const a = analyseWords(words);
    const transcript = words.map((w) => w.word.trim()).join(' ').trim();
    const valid = a.wordCount >= 15;
    const wpm = a.lastEnd > 0 ? Math.round((a.wordCount / Math.max(10, a.lastEnd)) * 60) : 0;

    // Save the audio.
    const baseType = (audio.type || 'audio/webm').split(';')[0];
    const ext = baseType.includes('mp4') ? 'mp4' : baseType.includes('ogg') ? 'ogg' : 'webm';
    const path = `lecturette/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    let audioUrl: string | null = null;
    const up = await admin.storage
      .from('narration-audio')
      .upload(path, Buffer.from(await audio.arrayBuffer()), { contentType: baseType, upsert: false });
    if (!up.error) audioUrl = admin.storage.from('narration-audio').getPublicUrl(path).data.publicUrl;
    else console.error('lecturette audio upload failed', up.error.message);

    const row = {
      user_id: user.id,
      visitor_id: visitor,
      topic_id: topic.id,
      topic: topic.title,
      category: topic.category,
      audio_url: audioUrl,
      duration_seconds: duration,
      transcript,
      valid,
      word_count: a.wordCount,
      wpm,
      filler_count: a.fillerCount,
      stammer_count: a.stammerCount,
      pause_count: a.pauseCount,
      longest_pause: a.longestPause,
      tokens: a.tokens,
    };
    const { data: saved, error } = await admin.from('lecturette_attempts').insert(row).select('*').single();
    if (error) console.error('lecturette save failed', error.message);

    return NextResponse.json({
      attempt: saved || { ...row, id: `tmp-${Date.now()}`, created_at: new Date().toISOString() },
      message: valid
        ? undefined
        : a.wordCount === 0
        ? 'No speech was detected in your recording.'
        : 'Your lecturette was too short to count (under 15 words).',
    });
  } catch (err: any) {
    console.error('lecturette transcribe failed', err);
    return NextResponse.json({ error: err?.message || 'Transcription failed.' }, { status: 502 });
  }
}
