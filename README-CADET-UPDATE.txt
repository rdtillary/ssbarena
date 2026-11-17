SSB Arena update: "Contact Recommended Candidates" chat

1. Unzip. Drag the folders "app", "components" and "supabase" into the ROOT of your
   GitHub repo (Add file > Upload files). They add/replace:
     app/page.tsx                                   (replaced: new button + modal on home)
     app/admin/page.tsx                             (replaced: Cadet Inbox panel at top)
     app/api/contact/messages/route.ts              (new)
     app/api/admin/messages/route.ts                (new)
     components/ContactCadetModal.tsx               (new)
     components/AdminInbox.tsx                      (new)
     supabase/migrations/20261117_candidate_messages.sql (new)
2. Run the SQL file once in the Supabase SQL Editor.
3. Render redeploys. Open /admin > "Cadet Inbox" to read and reply.
