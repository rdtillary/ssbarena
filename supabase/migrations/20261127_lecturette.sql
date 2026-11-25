-- Lecturette practice section. Safe to re-run.
create table if not exists public.lecturette_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  visitor_id text,
  topic_id int,
  topic text not null,
  category text,
  audio_url text,
  duration_seconds int default 0,
  transcript text,
  valid boolean,
  word_count int,
  wpm int,
  filler_count int,
  stammer_count int,
  pause_count int,
  longest_pause numeric,
  tokens jsonb,
  created_at timestamptz not null default now()
);
create index if not exists lecturette_user_idx on public.lecturette_attempts (user_id, created_at desc);
create index if not exists lecturette_created_idx on public.lecturette_attempts (created_at desc);

alter table public.lecturette_attempts enable row level security;
drop policy if exists "Users read own lecturettes" on public.lecturette_attempts;
create policy "Users read own lecturettes"
  on public.lecturette_attempts for select
  using (auth.uid() = user_id);
-- Writes happen only on the server (service role).
