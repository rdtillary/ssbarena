import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { name, ssb_name, photo_url } = await req.json();
  if (!name?.trim() || !ssb_name?.trim() || !photo_url) {
    return NextResponse.json({ error: 'Name, SSB and photo are required' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data, error } = await admin
    .from('recommended_candidates')
    .insert({ name: name.trim(), ssb_name: ssb_name.trim(), photo_url })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const id = Number(new URL(req.url).searchParams.get('id'));
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const admin = createAdminSupabase();
  const { error } = await admin.from('recommended_candidates').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
