import { PRO_PRICE_INR } from '@/lib/config';

export default function TermsPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-4 text-sm text-slate-300">
      <h1 className="text-2xl font-black text-white">Terms &amp; Conditions</h1>
      <p>
        SSB Arena is an independent digital self-practice simulator for SSB screening preparation
        and is not affiliated with UPSC, the Ministry of Defence, or the Indian Armed Forces.
      </p>
      <p>
        The ₹{PRO_PRICE_INR} Lifetime Pro Pass is a one-time payment that grants personal,
        non-transferable digital access for as long as SSB Arena is operated, starting from
        payment confirmation. Sharing accounts or scraping test content is prohibited.
      </p>
    </main>
  );
}
