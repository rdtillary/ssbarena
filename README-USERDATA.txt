SSB Arena update: admin "User Data" tab (visits + all PPDT attempts with audio & transcript)

1. Unzip. Drag the folders "app", "components", "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). Confirm replacing app/layout.tsx and app/admin/layout.tsx.
2. Supabase > SQL Editor > run supabase/migrations/20261124_site_visits.sql once.
3. Render redeploys. Open /admin > "User Data" tab.

Notes
 - Visits are counted from the moment this goes live (older visits were never recorded).
 - One visit = one browser session; admin pages and bots are ignored.
 - Attempts are listed per user (newest first, 100 at a time, "Load more").
 - No edit to app/admin/page.tsx is needed.
