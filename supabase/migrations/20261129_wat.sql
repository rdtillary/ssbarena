-- WAT attempts are stored in user_attempts, so allow the 'WAT' type. Safe to re-run.
alter table public.user_attempts drop constraint if exists user_attempts_attempt_type_check;
alter table public.user_attempts
  add constraint user_attempts_attempt_type_check check (attempt_type in ('PPDT', 'OIR', 'WAT'));

-- Restores the current sign-up function, in case the older WAT migration replaced it.
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
