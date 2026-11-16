SSB Arena update: Bulk Add PPDT Photos (admin)

1. Unzip. Drag the "app" and "components" folders into the ROOT of your GitHub repo
   (Add file > Upload files). They replace/add:
     components/BulkPhotoPanel.tsx   (new)
     app/admin/page.tsx              (replaced: now shows the new panel under Bulk Add)
2. Render redeploys. No new SQL needed.
3. Open /admin > "Bulk Add PPDT Photos".

How to use:
  a) Click "Choose photos" and select many images at once (files named like PPDT-1.webp).
  b) A file is matched to the scenario whose title has the same number.
     Set "Number offset" if they differ: PPDT-1.webp + offset 25 -> "Sample Story : 26".
  c) Check the preview list, then click Upload.
