import { PRO_PERIOD_DAYS } from '@/lib/pricing';

/** Adds one paid period of Pro. If Pro is still active the time is added on top. */
export async function grantProPeriod(admin: any, userId: string) {
  const { data: prof } = await admin
    .from('profiles')
    .select('pro_expires_at')
    .eq('id', userId)
    .single();
  const now = Date.now();
  const currentEnd = prof?.pro_expires_at ? new Date(prof.pro_expires_at).getTime() : 0;
  const base = currentEnd > now ? currentEnd : now;
  const newEnd = new Date(base + PRO_PERIOD_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await admin.from('profiles').update({ is_pro: true, pro_expires_at: newEnd }).eq('id', userId);
}
