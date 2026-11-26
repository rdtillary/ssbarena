-- Sign-up wall (email or mobile), onboarding quiz answers, WAT attempts. Safe to re-run.

-- 1. Mobile number on profiles + trigger that fills it at sign-up
alter table public.profiles add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- 2. Onboarding quiz answers (one row per user)
create table if not exists public.onboarding_answers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text,
  exam text,
  ssb_centre text,
  reporting_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.onboarding_answers enable row level security;

drop policy if exists "Users read own onboarding" on public.onboarding_answers;
create policy "Users read own onboarding"
  on public.onboarding_answers for select using (auth.uid() = user_id);

drop policy if exists "Users insert own onboarding" on public.onboarding_answers;
create policy "Users insert own onboarding"
  on public.onboarding_answers for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own onboarding" on public.onboarding_answers;
create policy "Users update own onboarding"
  on public.onboarding_answers for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 3. WAT attempts are stored in user_attempts, so allow the 'WAT' type
alter table public.user_attempts drop constraint if exists user_attempts_attempt_type_check;
alter table public.user_attempts
  add constraint user_attempts_attempt_type_check check (attempt_type in ('PPDT', 'OIR', 'WAT'));
