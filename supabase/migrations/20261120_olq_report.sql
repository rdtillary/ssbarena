-- Stores the AI OLQ report on each attempt so it is only generated once. Safe to re-run.
alter table public.user_attempts
  add column if not exists olq_report jsonb;
