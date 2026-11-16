import { createServerSupabase } from '@/lib/supabase/server';

export async function verifyAdmin(): Promise<boolean> {
  const supabase = createServerSupabase();
  const { data } = await supabase.auth.getUser();
  const email = data?.user?.email?.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  return Boolean(email && adminEmail && email === adminEmail);
}
