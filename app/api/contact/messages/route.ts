import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const MAX_LEN = 1000;
const MAX_PER_MINUTE = 5;

// The signed-in aspirant's own conversation with the Cadet.
export async function GET() {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('candidate_messages')
    .select('id, sender, body, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: true })
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Mark the Cadet's replies as read.
  await admin
    .from('candidate_messages')
    .update({ read_by_user: true })
    .eq('user_id', auth.user.id)
    .eq('sender', 'cadet')
    .eq('read_by_user', false);

  return NextResponse.json({ messages: data || [] });
}

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });

  let body = '';
  try {
    body = String((await req.json())?.body ?? '').trim();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Write a message first.' }, { status: 400 });
  if (body.length > MAX_LEN) {
    return NextResponse.json({ error: `Keep it under ${MAX_LEN} characters.` }, { status: 400 });
  }

  const admin = createAdminSupabase();

  // Simple spam guard: max 5 messages per minute per user.
  const since = new Date(Date.now() - 60_000).toISOString();
  const { count } = await admin
    .from('candidate_messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)
    .eq('sender', 'user')
    .gte('created_at', since);
  if ((count || 0) >= MAX_PER_MINUTE) {
    return NextResponse.json({ error: 'Slow down a little and try again in a minute.' }, { status: 429 });
  }

  const { data, error } = await admin
    .from('candidate_messages')
    .insert({ user_id: auth.user.id, sender: 'user', body })
    .select('id, sender, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
