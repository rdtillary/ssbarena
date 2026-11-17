-- Messages between aspirants and the "Cadet" (admin). Safe to re-run.
create table if not exists public.candidate_messages (
  id bigserial primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  sender text not null check (sender in ('user', 'cadet')),
  body text not null check (char_length(body) between 1 and 1000),
  read_by_admin boolean not null default false,
  read_by_user boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists candidate_messages_user_idx
  on public.candidate_messages (user_id, created_at);

alter table public.candidate_messages enable row level security;

-- Users can read their own conversation. All writes go through the API routes
-- (service role), so no insert/update policy is created for browsers.
drop policy if exists "Users read own messages" on public.candidate_messages;
create policy "Users read own messages"
  on public.candidate_messages for select
  using (auth.uid() = user_id);
