-- Creator referral links + commission tracking. Safe to re-run.
create table if not exists public.creators (
  id bigserial primary key,
  code text not null unique check (code ~ '^[a-z0-9_-]{3,30}$'),
  name text not null,
  email text,
  commission_pct numeric(5,2) not null default 10 check (commission_pct between 0 and 100),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  creator_id bigint not null references public.creators(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists referrals_creator_idx on public.referrals (creator_id);

create table if not exists public.referral_earnings (
  id bigserial primary key,
  creator_id bigint not null references public.creators(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_id text not null unique,
  amount_paise integer not null,
  commission_pct numeric(5,2) not null,
  commission_paise integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid')),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists referral_earnings_creator_idx on public.referral_earnings (creator_id, status);

alter table public.creators enable row level security;
alter table public.referrals enable row level security;
alter table public.referral_earnings enable row level security;
