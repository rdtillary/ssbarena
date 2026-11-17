SSB Arena update: OIR question images + 5 new OIR sets

1. Drag the folders "app", "public" and "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). They add/replace:
     app/api/admin/bulk/route.ts      (accepts image_url on OIR questions)
     app/oir/[id]/page.tsx            (shows the question image)
     public/oir/wda14/q01..q50.jpg    (50 question images cropped from the PDF)
     supabase/migrations/20261116_oir_question_images.sql
2. Run the SQL file once in the Supabase SQL Editor (adds oir_questions.image_url).
3. Render redeploys. Then open /admin > Bulk Add > OIR Sets:
     - oir-set-03.json          -> 50 PDF questions, each with its image
     - oir-sets-04-to-08.json   -> five 20-question, 10-minute text sets
   Click Check, then Import. (These two JSON files are for pasting; no need to upload them to GitHub.)
