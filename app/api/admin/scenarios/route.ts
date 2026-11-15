import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(email && adminEmail && email === adminEmail);
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const body = await req.json();
  const admin = createAdminSupabase();
  const { data, error } = await admin.from('ppdt_scenarios').insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { id, ...updates } = await req.json();
  const admin = createAdminSupabase();
  const { error } = await admin.from('ppdt_scenarios').update(updates).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get('id'));
  const admin = createAdminSupabase();
  await admin.from('ppdt_scenarios').delete().eq('id', id);
  return NextResponse.json({ success: true });
}
