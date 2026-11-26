import Razorpay from 'razorpay';
import { PRO_PRICE_INR } from '@/lib/pricing';

export function getRazorpay(): any {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });
}

/** Returns the monthly plan id, creating the plan on Razorpay the first time. */
export async function ensurePlanId(admin: any, rz: any): Promise<string> {
  const amount = PRO_PRICE_INR * 100;
  const mode = (process.env.RAZORPAY_KEY_ID || '').startsWith('rzp_live') ? 'live' : 'test';

  const { data: row } = await admin
    .from('razorpay_plans')
    .select('plan_id')
    .eq('mode', mode)
    .eq('amount_paise', amount)
    .maybeSingle();
  if (row?.plan_id) return row.plan_id;

  const plan = await rz.plans.create({
    period: 'monthly',
    interval: 1,
    item: {
      name: 'SSB Arena Pro (monthly)',
      amount,
      currency: 'INR',
      description: 'Full access to all PPDT, OIR, Lecturette and OLQ analysis',
    },
  });
  await admin.from('razorpay_plans').insert({ mode, amount_paise: amount, plan_id: plan.id });
  return plan.id;
}
