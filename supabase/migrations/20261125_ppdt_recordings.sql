-- Every PPDT narration recording (guest or signed-in), keyed by an anonymous visitor ID. Safe to re-run.
create table if not exists public.ppdt_recordings (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  scenario_id int,
  scenario_title text,
  audio_url text,
  duration_seconds int default 0,
  main_action text,
  transcript text,
  valid boolean,
  story_score int,
  narration_score int,
  total_score int,
  created_at timestamptz not null default now()
);
create index if not exists ppdt_recordings_visitor_idx on public.ppdt_recordings (visitor_id, created_at);
create index if not exists ppdt_recordings_created_idx on public.ppdt_recordings (created_at);
alter table public.ppdt_recordings enable row level security;
-- No policies on purpose: only the server (service role) can read or write.
