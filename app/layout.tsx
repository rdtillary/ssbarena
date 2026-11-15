import type { Metadata } from 'next';
import './globals.css';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'SSB Arena — Stage-1 PPDT & OIR Screening Simulator',
  description:
    'Practice real 30-second PPDT perception, paper story writing, 1-minute voice narration with AI transcription, and timed OIR speed drills.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#090D16] text-slate-100 antialiased">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
