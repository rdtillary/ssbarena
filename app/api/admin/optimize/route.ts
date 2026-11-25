import { NextResponse } from 'next/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { verifyAdmin } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

// Where picture links are stored: table, key column, link column, storage bucket.
const SOURCES = [
  { table: 'ppdt_scenarios', key: 'id', column: 'image_url', bucket: 'ppdt-scenes' },
  { table: 'recommended_candidates', key: 'id', column: 'photo_url', bucket: 'candidate-photos' },
  { table: 'ssb_centres', key: 'code', column: 'image_url', bucket: 'ssb-centres' },
];

export async function GET() {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const admin = createAdminSupabase();
  const items: { table: string; id: string | number; bucket: string; url: string }[] = [];
  for (const s of SOURCES) {
    const { data, error } = await admin.from(s.table).select(`${s.key}, ${s.column}`);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    for (const row of (data || []) as any[]) {
      const url = String(row[s.column] || '');
      // Only pictures stored in Supabase.
      if (url.includes(`/storage/v1/object/public/${s.bucket}/`)) {
        items.push({ table: s.table, id: row[s.key], bucket: s.bucket, url });
      }
    }
  }
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  if (!(await verifyAdmin())) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  const { table, id, url } = await req.json();
  const s = SOURCES.find((x) => x.table === table);
  if (!s || id === undefined || !String(url).includes(`/${s.bucket}/`)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const admin = createAdminSupabase();
  const { error } = await admin.from(s.table).update({ [s.column]: url }).eq(s.key, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
