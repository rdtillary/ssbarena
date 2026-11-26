SSB Arena update: sign-up wall + 3-question quiz + WAT + sharper AI assessment + admin User Data

1. Unzip. Drag the folders "app", "components", "lib" and "supabase" into the ROOT of your
   GitHub repo (Add file > Upload files). Confirm replacing existing files.
2. Supabase > SQL Editor > paste and run supabase/migrations/20261126_gate_onboarding_wat.sql once.
   (Run it BEFORE users start signing up, otherwise the quiz is skipped and WAT results cannot be saved.)
3. Supabase > Authentication > Providers > Email: keep "Confirm email" OFF (you already did).
   Mobile numbers work without any SMS service: they sign in with number + password.
4. Render redeploys. Open ssbarena.onrender.com in a private window to see the sign-up screen.

What changed
 - Everyone must sign up / log in first (email or 10-digit mobile + password, or Google).
   Terms, Privacy, Refund, Contact and Pricing pages stay open (needed for Razorpay).
 - Then a 3-question quiz (the 3rd only when "My SSB is coming up"), then the site opens.
 - New WAT section: WAT tab + button on the home page, 7 sets x 60 words, Type or Write mode.
   Set 01 is free, sets 02-07 are Pro.
 - PPDT grading prompt rewritten to judge the story on its own merit (no bias to the model story).
 - Admin > User Data > All Users: click any user for account, quiz answers, payments, every PPDT
   result page with the OLQ report, WAT sentences and OIR scores. The Users tab was removed from Manage.
 - Pro grant in admin now accepts a mobile number too.
