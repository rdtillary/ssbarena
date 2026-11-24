-- Website visit tracking for the admin "User Data" tab. Safe to re-run.
create table if not exists public.site_visits (
  id bigserial primary key,
  visitor_id text not null,
  path text,
  created_at timestamptz not null default now()
);
create index if not exists site_visits_created_idx on public.site_visits (created_at);
alter table public.site_visits enable row level security;
-- No policies: only the server (service role) can read or write.
