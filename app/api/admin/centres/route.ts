import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';
import { getCentre } from '@/lib/ssb-centres';

export async function POST(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { code, image_url } = await req.json();
  if (!getCentre(code) || !image_url) {
    return NextResponse.json({ error: 'Valid centre code and image are required' }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { error } = await admin
    .from('ssb_centres')
    .upsert({ code, image_url, updated_at: new Date().toISOString() }, { onConflict: 'code' });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
