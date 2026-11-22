import { PRO_PRICE_INR } from '@/lib/pricing';

export default function PricingPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-black text-white">Pricing — SSB Arena</h1>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <h2 className="text-lg font-bold text-white">Free Starter Tier — ₹0</h2>
          <p className="text-xs text-slate-400">2 Full PPDT Timed Simulations + 1 OIR Speed Drill Set.</p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/50 space-y-2">
          <h2 className="text-lg font-bold text-amber-400">Pro Subscription — ₹{PRO_PRICE_INR} per month</h2>
          <p className="text-xs text-slate-300">
            Full access to all PPDT scenarios, recommended candidate responses, voice narration
            storage, AI OLQ reports, and all OIR sets. Billed every month via UPI AutoPay or card
            until you cancel. Cancel any time from the Pro screen on the website; you keep access
            until the end of the month you have paid for.
          </p>
        </div>
      </div>
    </main>
  );
}
