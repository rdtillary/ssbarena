-- Compulsory sign-up + onboarding quiz. Safe to run more than once.
-- Paste into Supabase -> SQL Editor -> New query -> Run.

create table if not exists public.onboarding_responses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  user_type text not null,
  target_entry text not null,
  ssb_centre text,
  ssb_date date,
  created_at timestamptz not null default now()
);

alter table public.onboarding_responses enable row level security;
grant select, insert, update on public.onboarding_responses to authenticated;

drop policy if exists "Users read own quiz" on public.onboarding_responses;
create policy "Users read own quiz"
  on public.onboarding_responses for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users insert own quiz" on public.onboarding_responses;
create policy "Users insert own quiz"
  on public.onboarding_responses for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users update own quiz" on public.onboarding_responses;
create policy "Users update own quiz"
  on public.onboarding_responses for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep the mobile number in its own column on profiles.
alter table public.profiles add column if not exists phone text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    case when new.email like '%@phone.ssbarena.onrender.com' then split_part(new.email, '@', 1) end
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;
