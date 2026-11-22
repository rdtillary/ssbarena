import { PRO_PERIOD_DAYS } from '@/lib/pricing';

const DAY = 24 * 60 * 60 * 1000;
// Small cushion so access never lapses a day before the next monthly charge lands.
const GRACE_DAYS = 2;

async function readPro(admin: any, userId: string) {
  const { data } = await admin
    .from('profiles')
    .select('is_pro, pro_expires_at')
    .eq('id', userId)
    .single();
  return {
    lifetime: Boolean(data?.is_pro && !data?.pro_expires_at), // manually granted lifetime pass
    end: data?.pro_expires_at ? new Date(data.pro_expires_at).getTime() : 0,
  };
}

/** Adds one paid period of Pro (one-time orders). Never shortens a lifetime pass. */
export async function grantProPeriod(admin: any, userId: string) {
  const cur = await readPro(admin, userId);
  if (cur.lifetime) return;
  const base = cur.end > Date.now() ? cur.end : Date.now();
  const newEnd = new Date(base + PRO_PERIOD_DAYS * DAY).toISOString();
  await admin.from('profiles').update({ is_pro: true, pro_expires_at: newEnd }).eq('id', userId);
}

/** Pro until the end of the paid cycle (plus a short grace). Never shortens existing access. */
export async function setProUntil(admin: any, userId: string, until: Date) {
  const cur = await readPro(admin, userId);
  if (cur.lifetime) return;
  const end = new Date(Math.max(cur.end, until.getTime())).toISOString();
  await admin.from('profiles').update({ is_pro: true, pro_expires_at: end }).eq('id', userId);
}

/** End date of a paid subscription cycle from Razorpay's `current_end` (unix seconds). */
export function paidUntil(currentEndUnix?: number | null): Date {
  if (currentEndUnix) return new Date(currentEndUnix * 1000 + GRACE_DAYS * DAY);
  return new Date(Date.now() + PRO_PERIOD_DAYS * DAY);
}
