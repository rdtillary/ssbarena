-- UPI payment requests: user pays by UPI, submits UTR, admin approves. Safe to re-run.
create table if not exists public.upi_payments (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  utr text not null,
  amount_inr integer not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- One transaction ID can only ever be used once.
create unique index if not exists upi_payments_utr_unique on public.upi_payments (utr);
create index if not exists upi_payments_status_idx on public.upi_payments (status, created_at);

alter table public.upi_payments enable row level security;

drop policy if exists "Users read own upi payments" on public.upi_payments;
create policy "Users read own upi payments"
  on public.upi_payments for select
  using (auth.uid() = user_id);
