-- Login days for the profile streak. Safe to re-run.
-- Paste the whole file into Supabase -> SQL Editor and press Run.

create table if not exists public.user_activity_days (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);

alter table public.user_activity_days enable row level security;
revoke insert, update, delete on public.user_activity_days from anon, authenticated;
grant select on public.user_activity_days to authenticated;
drop policy if exists "Users read own activity days" on public.user_activity_days;
create policy "Users read own activity days"
  on public.user_activity_days for select to authenticated
  using (auth.uid() = user_id);

-- Marks "today" (India time) for the signed-in user. The date cannot be chosen by the browser.
create or replace function public.record_activity()
returns void as $$
  insert into public.user_activity_days (user_id, day)
  select id, (now() at time zone 'Asia/Kolkata')::date from public.profiles where id = auth.uid()
  on conflict do nothing;
$$ language sql security definer set search_path = public;

revoke execute on function public.record_activity() from public, anon;
grant execute on function public.record_activity() to authenticated;

-- Fill in past days from tests already given.
insert into public.user_activity_days (user_id, day)
select user_id, (created_at at time zone 'Asia/Kolkata')::date
from (
  select user_id, created_at from public.user_attempts
  union all
  select user_id, created_at from public.lecturette_attempts
) t
where user_id in (select id from public.profiles)
on conflict do nothing;
