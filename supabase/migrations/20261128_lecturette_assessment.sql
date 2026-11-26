-- Lecturette assessment (5 GTO criteria). Safe to re-run.
alter table public.lecturette_attempts add column if not exists assessment jsonb;
alter table public.lecturette_attempts add column if not exists total_score int;
