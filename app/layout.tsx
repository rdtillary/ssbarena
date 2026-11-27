import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';
import { ReferralClaim } from '@/components/ReferralClaim';
import { VisitTracker } from '@/components/VisitTracker';
import { AuthGate } from '@/components/onboarding/AuthGate';
import { ProUpsellPopup } from '@/components/ProUpsellPopup';
import { FloatingContact } from '@/components/FloatingContact';

export const metadata: Metadata = {
  title: 'SSB Arena — SSB Simulator for PPDT, OIR & Lecturette',
  description:
    'The SSB simulator: real 30-second PPDT perception, paper story writing, 1-minute voice narration with live transcription, timed OIR speed drills, Lecturette assessment and OLQ analysis.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 antialiased">
        <ReferralClaim />
        <VisitTracker />
        <div className="flex-1">
          <AuthGate>
            {children}
            <FloatingContact />
            <ProUpsellPopup />
          </AuthGate>
        </div>
        <Footer />
      </body>
    </html>
  );
}
