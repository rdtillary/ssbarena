import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (data?.user?.email?.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { email } = await req.json();
  const admin = createAdminSupabase();

  const { data: updated, error } = await admin
    .from('profiles')
    .update({ is_pro: true, pro_expires_at: null })
    .eq('email', email.trim().toLowerCase())
    .select();

  if (error || !updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'User email not found. Ask them to sign in once first.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: `Pro activated (no expiry) for ${email}!` });
}
