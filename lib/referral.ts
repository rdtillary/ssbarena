/**
 * Records the creator's commission for one paid payment of a referred user.
 * Safe to call more than once for the same payment (payment_id is unique).
 * Never throws: a referral problem must not break a payment.
 */
export async function recordCommission(
  admin: any,
  userId: string,
  paymentId: string | undefined,
  amountPaise: number | undefined
) {
  try {
    if (!paymentId || !amountPaise || amountPaise <= 0) return;
    const { data: ref } = await admin
      .from('referrals')
      .select('creator_id, creators(commission_pct)')
      .eq('user_id', userId)
      .maybeSingle();
    if (!ref) return;
    const c = Array.isArray(ref.creators) ? ref.creators[0] : ref.creators;
    const pct = Number(c?.commission_pct);
    if (!Number.isFinite(pct) || pct <= 0) return;
    const commission = Math.floor((amountPaise * pct) / 100);
    if (commission <= 0) return;
    await admin.from('referral_earnings').insert({
      creator_id: ref.creator_id,
      user_id: userId,
      payment_id: paymentId,
      amount_paise: amountPaise,
      commission_pct: pct,
      commission_paise: commission,
    });
  } catch (e) {
    console.error('recordCommission failed', e);
  }
}
