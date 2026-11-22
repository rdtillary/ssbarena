-- Razorpay autopay (monthly subscription). Safe to re-run.
create table if not exists public.razorpay_plans (
  mode text not null,
  amount_paise integer not null,
  plan_id text not null,
  created_at timestamptz not null default now(),
  primary key (mode, amount_paise)
);

create table if not exists public.subscriptions (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  razorpay_subscription_id text not null unique,
  status text not null default 'created',
  current_end timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists subscriptions_user_idx on public.subscriptions (user_id, created_at);

create table if not exists public.subscription_payments (
  razorpay_payment_id text primary key,
  razorpay_subscription_id text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.razorpay_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.subscription_payments enable row level security;

drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);
