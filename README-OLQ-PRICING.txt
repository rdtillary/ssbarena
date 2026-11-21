SSB Arena update: 15-OLQ AI report + Rs 99/month pricing

1. Unzip and drag the folders "app", "components", "lib", "supabase" into the ROOT of your
   GitHub repo (Add file > Upload files). Confirm replacing existing files.
2. Supabase > SQL Editor > run supabase/migrations/20261120_olq_report.sql once:
     alter table public.user_attempts add column if not exists olq_report jsonb;
3. Render > Environment: make sure ONE AI key exists
     ANTHROPIC_API_KEY  or  GEMINI_API_KEY  or  OPENAI_API_KEY
   Optional: AI_MODEL = the model name you want to use.
4. Price is set in lib/pricing.ts (99 per month, 30 days).
