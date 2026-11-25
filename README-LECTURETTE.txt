SSB Arena update: Lecturette section (spin wheel + 3-minute narration + admin recordings)

1. Drag the folders "app", "components", "lib", "supabase" into the ROOT of your GitHub repo
   (Add file > Upload files). It adds new files and REPLACES components/AdminNav.tsx.
2. Supabase > SQL Editor: run supabase/migrations/20261127_lecturette.sql once.
3. Two small edits in app/page.tsx (GitHub pencil icon):
   a) add import:   import { LecturetteEntry } from '@/components/LecturetteEntry';
   b) directly ABOVE the line   {(activeTab === 'home' || activeTab === 'ppdt') && (
      add:          {activeTab === 'home' && <LecturetteEntry />}
   (Optional, for the top menu on desktop and bottom menu on phones: users can also open /lecturette directly.)
4. Render redeploys. Open /lecturette. Admin: /admin > Lecturettes.
Uses the same GROQ_API_KEY as PPDT. No new environment variables.
