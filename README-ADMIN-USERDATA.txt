SSB Arena update: everything about every user in Admin > User Data

1. Unzip. Drag the folders "app" and "components" into the ROOT of your GitHub repo
   (Add file > Upload files). Confirm replacing existing files.
   Replaced: app/admin/page.tsx, app/ppdt/[id]/page.tsx, app/api/ppdt/recording/route.ts,
             app/api/admin/user-data/route.ts, components/AdminUsers.tsx, components/AdminUserData.tsx
   New:      app/api/admin/olq-generate/route.ts
2. Supabase > SQL Editor: paste and run the SQL in the other zip (20261126_recording_results.sql) once.
3. Render redeploys. Open /admin > User Data.

What you get
 - User Data has two tabs: "All Users" (plan, autopay, joined, attempts, centre...) and
   "Recordings, Results & OLQ".
 - In All Users, open a user and press "View all recordings, results & OLQ reports".
 - Every recording has "Show full result, OLQ report & assessment": the same result page the
   user sees (recommendation meter, 15-OLQ radar + scores, breakdown, annotated transcript,
   strengths, improvements, model story).
 - The Users section is removed from the Manage tab.
 - Recordings made BEFORE this update have no saved OLQ; press "Generate 15-OLQ report now"
   on them (uses your AI key).
 - Users' own results page now also gets OLQ + recommendation for new attempts.
