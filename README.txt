SSB Arena update: AI grading + less clutter

1. Unzip. Drag the "app", "components" and "lib" folders into the ROOT of your GitHub repo
   (Add file > Upload files). They replace the old versions of the same files.
2. Get a FREE key at https://console.groq.com (API Keys), no card needed.
3. In Render > your service > Environment, add:   GROQ_API_KEY = <your key>
   Optional: GROQ_STT_MODEL (default whisper-large-v3-turbo), GROQ_LLM_MODEL (default llama-3.3-70b-versatile)
4. Save. Render redeploys. Test a PPDT narration.
