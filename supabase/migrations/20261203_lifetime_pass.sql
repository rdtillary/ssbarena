-- ₹999 Lifetime Pass with mentor. Safe to re-run.
-- Paste the whole file into Supabase -> SQL Editor and press Run.

alter table public.profiles
  add column if not exists lifetime_pass_at timestamptz,
  add column if not exists mentor_candidate_id integer
    references public.recommended_candidates(id) on delete set null;

alter table public.payment_orders
  add column if not exists plan text,
  add column if not exists granted_at timestamptz;

-- Users may only edit these profile fields themselves (never Pro or mentor fields).
revoke update on public.profiles from authenticated, anon;
grant update (full_name, target_board, reporting_date) on public.profiles to authenticated;

-- Lifetime buyers and their mentors (open "lifetime_members" any time to check).
create or replace view public.lifetime_members
with (security_invoker = true) as
select p.id as user_id, p.email, p.full_name, p.lifetime_pass_at,
       p.mentor_candidate_id, c.name as mentor_name
from public.profiles p
left join public.recommended_candidates c on c.id = p.mentor_candidate_id
where p.lifetime_pass_at is not null
order by p.lifetime_pass_at desc;

revoke all on public.lifetime_members from anon, authenticated;
