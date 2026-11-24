SSB Arena update: narration Start button + live voice graph/transcript + every recording in admin

1. Unzip. Drag the folders "app", "components", "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). Confirm replacing existing files.
2. Supabase > SQL Editor: run these once each (skip one if you already ran it):
     supabase/migrations/20261124_site_visits.sql
     supabase/migrations/20261125_ppdt_recordings.sql
3. Render redeploys. Test a PPDT on your phone, then open /admin > User Data.

What changed
 - After the 4-minute writing phase you land on a narration screen. Nothing records until
   the user presses "Start Narration".
 - While speaking: live loudness graph + live text, with "Transcribing live with AI" at the bottom.
 - Every narration is saved on the server under an anonymous browser ID (shown to you as U-XXXXXX,
   never shown to the user), whether or not they are signed in. Admin > User Data lists them
   grouped by ID with audio, transcript and scores.
