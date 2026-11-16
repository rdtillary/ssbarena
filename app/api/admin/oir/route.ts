import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id, is_free } = await req.json();
  if (!id || typeof is_free !== 'boolean') {
    return NextResponse.json({ error: 'Missing id or is_free' }, { status: 400 });
  }
  const admin = createAdminSupabase();
  const { error } = await admin.from('oir_sets').update({ is_free }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const admin = createAdminSupabase();
  // oir_questions are removed automatically (on delete cascade).
  const { error } = await admin.from('oir_sets').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
