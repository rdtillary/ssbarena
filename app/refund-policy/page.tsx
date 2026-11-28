import { PRO_PRICE_INR, LIFETIME_PRICE_INR } from '@/lib/pricing';

export default function RefundPolicyPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-4 text-sm text-slate-300">
      <h1 className="text-2xl font-black text-white">Cancellation &amp; Refund Policy</h1>
      <p>
        The ₹{PRO_PRICE_INR} monthly Pro subscription unlocks instant digital access to practice
        scenarios and assessments, so payments are generally non-refundable once activated.
      </p>
      <p>
        You can cancel autopay at any time from the Pro screen on the website. Cancelling stops
        future charges; you keep access until the end of the month you have already paid for. To
        avoid the next charge, cancel before your renewal date.
      </p>
      <p>
        The ₹{LIFETIME_PRICE_INR} Lifetime Pass is a one-time payment and is generally
        non-refundable once activated.
      </p>
      <p>
        If you experience a duplicate payment or a technical failure where your Pro Pass did not
        activate within 24 hours, email us with your Razorpay Payment ID within 48 hours for a
        full refund to your original payment method within 5–7 business days.
      </p>
    </main>
  );
}
