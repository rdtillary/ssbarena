-- TAT mocks: shuffles the PPDT pictures ONCE into 5 fixed sets of 11. Safe to re-run.

alter table public.user_attempts drop constraint if exists user_attempts_attempt_type_check;
alter table public.user_attempts
  add constraint user_attempts_attempt_type_check check (attempt_type in ('PPDT', 'OIR', 'WAT', 'TAT'));

create table if not exists public.tat_sets (
  id int primary key,
  scenario_ids int[] not null
);

alter table public.tat_sets enable row level security;
grant select on public.tat_sets to anon, authenticated;
drop policy if exists "Anyone can read TAT sets" on public.tat_sets;
create policy "Anyone can read TAT sets" on public.tat_sets for select using (true);

do $$
declare
  pool int[];
  n int;
begin
  -- One entry per different picture, in random order.
  select array_agg(id order by random()) into pool
  from (select min(id) as id from public.ppdt_scenarios where coalesce(image_url, '') <> '' group by image_url) p;
  n := coalesce(array_length(pool, 1), 0);
  if n < 11 then
    raise exception 'TAT needs at least 11 different PPDT pictures, found %', n;
  end if;

  -- Deal the shuffled pictures out in turn: no repeats inside a set, even spread across sets.
  for s in 1..5 loop
    insert into public.tat_sets (id, scenario_ids)
    select s, array_agg(pool[(((s - 1) * 11 + k) % n) + 1] order by k)
    from generate_series(0, 10) as k
    on conflict (id) do nothing;
  end loop;
end $$;

select id as mock, array_length(scenario_ids, 1) as pictures from public.tat_sets order by id;
