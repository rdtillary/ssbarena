import { PRO_PRICE_INR } from '@/lib/pricing';

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-4 text-sm text-slate-300">
      <h1 className="text-2xl font-black text-white">Terms &amp; Conditions</h1>
      <p>
        SSB Arena is an independent digital self-practice simulator for SSB preparation
        and is not affiliated with UPSC, the Ministry of Defence, or the Indian Armed Forces.
      </p>
      <p>
        The Pro subscription costs ₹{PRO_PRICE_INR} per month. By subscribing you authorise
        Razorpay to charge ₹{PRO_PRICE_INR} to your UPI AutoPay mandate or card every month until
        you cancel. It grants personal, non-transferable digital access for each paid month. You
        can cancel at any time from the Pro screen; access continues until the end of the paid
        month. Sharing accounts or scraping test content is prohibited.
      </p>
    </main>
  );
}
