-- Carousel (recommended candidates), SSB centre images, lifetime Pro Pass.
-- Safe to re-run. Paste into the Supabase SQL Editor for an existing project.

-- 8. RECOMMENDED CANDIDATES (homepage slideshow, managed from /admin)
create table if not exists public.recommended_candidates (
  id serial primary key,
  name text not null,
  ssb_name text not null,
  photo_url text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table public.recommended_candidates enable row level security;
drop policy if exists "Anyone can read recommended candidates" on public.recommended_candidates;
create policy "Anyone can read recommended candidates"
  on public.recommended_candidates for select using (true);

-- 9. SSB CENTRE GATE IMAGES (uploaded from /admin; centre list lives in lib/ssb-centres.ts)
create table if not exists public.ssb_centres (
  code text primary key,
  image_url text,
  updated_at timestamptz default now()
);

alter table public.ssb_centres enable row level security;
drop policy if exists "Anyone can read ssb centres" on public.ssb_centres;
create policy "Anyone can read ssb centres"
  on public.ssb_centres for select using (true);

-- Storage buckets (uploads go through the admin API with the service role, so only public read is needed)
insert into storage.buckets (id, name, public)
values ('candidate-photos', 'candidate-photos', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('ssb-centres', 'ssb-centres', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for candidate-photos" on storage.objects;
create policy "Public read access for candidate-photos"
  on storage.objects for select using (bucket_id = 'candidate-photos');

drop policy if exists "Public read access for ssb-centres" on storage.objects;
create policy "Public read access for ssb-centres"
  on storage.objects for select using (bucket_id = 'ssb-centres');

-- 10. PROFILES: SSB centre is now chosen from a fixed list, no default
alter table public.profiles alter column target_board drop default;
update public.profiles set target_board = null where target_board = '34 SSB Allahabad';

-- 11. LIFETIME PASS: ₹199 default amount
alter table public.payment_orders alter column amount_paise set default 19900;

-- 12. SECURITY: users may only edit their own name / SSB centre / reporting date.
-- Without this, the "update own profile" policy lets any signed-in user set is_pro = true from the browser.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, target_board, reporting_date) on public.profiles to authenticated;
