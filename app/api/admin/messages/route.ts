import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// GET            -> list of conversations (one per aspirant), newest first
// GET ?user_id=X -> full thread for that aspirant (also marks it read)
export async function GET(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const admin = createAdminSupabase();
  const userId = new URL(req.url).searchParams.get('user_id');

  if (userId) {
    const { data, error } = await admin
      .from('candidate_messages')
      .select('id, sender, body, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    await admin
      .from('candidate_messages')
      .update({ read_by_admin: true })
      .eq('user_id', userId)
      .eq('sender', 'user')
      .eq('read_by_admin', false);
    return NextResponse.json({ messages: data || [] });
  }

  const { data, error } = await admin
    .from('candidate_messages')
    .select('user_id, sender, body, created_at, read_by_admin')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const threads = new Map<string, any>();
  for (const m of data || []) {
    const t = threads.get(m.user_id) || {
      user_id: m.user_id,
      last_body: m.body,
      last_sender: m.sender,
      last_at: m.created_at,
      unread: 0,
    };
    if (m.sender === 'user' && !m.read_by_admin) t.unread += 1;
    threads.set(m.user_id, t);
  }

  const ids = Array.from(threads.keys());
  const emails: Record<string, string> = {};
  if (ids.length) {
    const { data: profiles } = await admin.from('profiles').select('id, email').in('id', ids);
    (profiles || []).forEach((p: any) => (emails[p.id] = p.email));
  }

  const list = Array.from(threads.values()).map((t) => ({ ...t, email: emails[t.user_id] || 'unknown' }));
  return NextResponse.json({ threads: list });
}

// Reply as the Cadet.
export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  const userId = String(payload?.user_id || '');
  const body = String(payload?.body || '').trim();
  if (!userId || !body) return NextResponse.json({ error: 'Missing user or message' }, { status: 400 });
  if (body.length > 1000) return NextResponse.json({ error: 'Max 1000 characters.' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('candidate_messages')
    .insert({ user_id: userId, sender: 'cadet', body, read_by_admin: true })
    .select('id, sender, body, created_at')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: data });
}
