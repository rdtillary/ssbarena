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
  const raw = String(email || '').trim().toLowerCase();
  // A 10-digit mobile number maps to the private address used for mobile sign-ups.
  const digits = raw.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const lookup = !raw.includes('@') && /^\d{10}$/.test(digits) ? `${digits}@phone.ssbarena.in` : raw;

  const admin = createAdminSupabase();
  const { data: updated, error } = await admin
    .from('profiles')
    .update({ is_pro: true, pro_expires_at: null })
    .eq('email', lookup)
    .select();

  if (error || !updated || updated.length === 0) {
    return NextResponse.json(
      { error: 'User not found. Ask them to sign in once first.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ message: `Pro activated (no expiry) for ${raw}!` });
}
