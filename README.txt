SSB Arena update 3: Bulk Add (admin) + OIR sets from the database

1. Unzip. Drag the "app", "components" and "lib" folders into the ROOT of your GitHub repo
   (Add file > Upload files). They replace the files with the same names.
2. Render redeploys. No new SQL needed (oir_sets / oir_questions already exist in your schema).
3. Open /admin > "Bulk Add".

How to use:
  a) Pick a tab (PPDT Stories / OIR Sets / Candidates / Pro Emails).
  b) Click "Copy format for Claude". Paste it into Claude and add the website link after "Website:".
  c) Copy Claude's JSON answer, paste it into the box, click Check, then Import.
Existing titles are skipped, so pasting the same data twice is safe.

Also in this zip: the AI grading model default is now openai/gpt-oss-120b.
