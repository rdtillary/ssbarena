SSB Arena update: manual UPI payments

1. Unzip. Drag the folders "app", "components", "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). Confirm replacing app/page.tsx and app/admin/page.tsx.
   (These two files also include the earlier Cadet chat changes.)
2. Supabase > SQL Editor > run supabase/migrations/20261119_upi_payments.sql once.
   (Also run 20261117_candidate_messages.sql if you have not yet.)
3. Render > Environment, add:
     NEXT_PUBLIC_UPI_ID    = yourname@bank      (your real UPI ID)
     NEXT_PUBLIC_UPI_NAME  = SSB Arena
   Save; Render redeploys.
4. Pro button now opens the UPI popup. Pending payments appear at the top of /admin.
