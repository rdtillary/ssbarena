# SSB Arena — Stage-1 Screening Simulator (PPDT & OIR)

Mobile-first SSB Stage-1 screening simulator built with **Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase, and Razorpay (₹99/month autopay Pro subscription)**.

## Features
- **Strict 4-Phase PPDT Simulator:**
  1. `00:30` Hazy black-and-white projector scene observation
  2. `01:00` Interactive character box pinning (`Age / Sex / Mood / Hero`)
  3. `04:00` Pen-on-paper story writing timer (no typing)
  4. `01:00` Spoken narration recording + live browser Speech-to-Text auto-transcription
- **AI OLQ & Narration Assessment Report:** Grades story structure (`/40`) + vocal fluency/WPM (`/20`), saves `.webm` audio + transcript to Supabase Vault, and unlocks the Recommended Candidate Response.
- **10-Minute OIR Speed Drill:** 20 verbal & non-verbal questions with live `45s+` time-trap warnings and WhatsApp challenge sharing.
- **Built-in `/admin` Dashboard:** Upload/swap PPDT pictures from phone or laptop, toggle Free vs Pro locks, and manually activate Pro passes by user email.

## Quick Setup
1. Run `supabase/schema.sql` in your Supabase SQL Editor. Existing projects: run `supabase/migrations/20261115_carousel_centres_lifetime.sql` instead.
2. Copy `.env.example` to `.env.local` and fill in your Supabase, Admin Email, and Razorpay keys.
3. Run `npm install && npm run dev` locally, or push to GitHub and deploy on Render (`npm install && npm run build` / `npm start`).
