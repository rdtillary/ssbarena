-- Creator partnership: click tracking + profile fields. Safe to re-run.
-- (Run 20261122_referrals.sql first if you have not.)
alter table public.creators add column if not exists instagram_handle text;
alter table public.creators add column if not exists notes text;
alter table public.creators add column if not exists per_click_paise integer not null default 0 check (per_click_paise >= 0);
alter table public.creators add column if not exists clicks_paid integer not null default 0;

create table if not exists public.creator_clicks (
  id bigserial primary key,
  creator_id bigint not null references public.creators(id) on delete cascade,
  visitor_id text not null,
  created_at timestamptz not null default now()
);
create index if not exists creator_clicks_creator_idx on public.creator_clicks (creator_id, created_at);
alter table public.creator_clicks enable row level security; -- server (service role) only
