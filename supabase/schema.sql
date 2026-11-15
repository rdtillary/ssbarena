-- Enable UUID extension
create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  target_board text default '34 SSB Allahabad',
  reporting_date date,
  is_pro boolean default false,
  pro_expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. PPDT SCENARIOS TABLE
create table if not exists public.ppdt_scenarios (
  id serial primary key,
  title text not null,
  difficulty text default 'Standard',
  is_free boolean default false,
  image_url text,
  scene_preset text default 'village_panchayat',
  expected_characters int default 3,
  key_cues text[] default '{}',
  recommended_story text not null,
  olq_highlights text[] default '{}',
  created_at timestamptz default now()
);

alter table public.ppdt_scenarios enable row level security;

drop policy if exists "Anyone can read PPDT scenarios" on public.ppdt_scenarios;
create policy "Anyone can read PPDT scenarios"
  on public.ppdt_scenarios for select
  using (true);

-- 3. OIR SETS & QUESTIONS
create table if not exists public.oir_sets (
  id serial primary key,
  title text not null,
  is_free boolean default false,
  duration_seconds int default 600,
  created_at timestamptz default now()
);

alter table public.oir_sets enable row level security;
drop policy if exists "Anyone can read OIR sets" on public.oir_sets;
create policy "Anyone can read OIR sets" on public.oir_sets for select using (true);

create table if not exists public.oir_questions (
  id serial primary key,
  set_id int references public.oir_sets(id) on delete cascade,
  question_number int not null,
  category text not null,
  question_text text not null,
  svg_diagram text,
  options jsonb not null,
  correct_index int not null,
  explanation text not null
);

alter table public.oir_questions enable row level security;
drop policy if exists "Anyone can read OIR questions" on public.oir_questions;
create policy "Anyone can read OIR questions" on public.oir_questions for select using (true);

-- 4. USER ATTEMPTS (STORES TRANSCRIPTS, AUDIO URLS, OLQ REPORTS & OIR SCORES)
create table if not exists public.user_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  attempt_type text not null check (attempt_type in ('PPDT', 'OIR')),
  scenario_id int not null,
  scenario_title text not null,
  story_score int default 0,
  narration_score int default 0,
  total_score int default 0,
  max_score int default 60,
  transcript text,
  audio_url text,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

alter table public.user_attempts enable row level security;

drop policy if exists "Users can view own attempts" on public.user_attempts;
create policy "Users can view own attempts"
  on public.user_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own attempts" on public.user_attempts;
create policy "Users can insert own attempts"
  on public.user_attempts for insert
  with check (auth.uid() = user_id);

-- 5. PAYMENT ORDERS (RAZORPAY ₹99 PASS)
create table if not exists public.payment_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  razorpay_order_id text unique not null,
  razorpay_payment_id text,
  amount_paise int not null default 9900,
  status text default 'created',
  created_at timestamptz default now()
);

alter table public.payment_orders enable row level security;

drop policy if exists "Users can view own orders" on public.payment_orders;
create policy "Users can view own orders"
  on public.payment_orders for select
  using (auth.uid() = user_id);

-- 6. STORAGE BUCKETS (PPDT SCENES + CANDIDATE NARRATION AUDIO)
insert into storage.buckets (id, name, public)
values ('ppdt-scenes', 'ppdt-scenes', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('narration-audio', 'narration-audio', true)
on conflict (id) do nothing;

drop policy if exists "Public read access for ppdt-scenes" on storage.objects;
create policy "Public read access for ppdt-scenes"
  on storage.objects for select
  using (bucket_id = 'ppdt-scenes');

drop policy if exists "Authenticated upload for ppdt-scenes" on storage.objects;
create policy "Authenticated upload for ppdt-scenes"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'ppdt-scenes');

drop policy if exists "Authenticated users can upload narration audio" on storage.objects;
create policy "Authenticated users can upload narration audio"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'narration-audio');

drop policy if exists "Public read access for narration-audio" on storage.objects;
create policy "Public read access for narration-audio"
  on storage.objects for select
  using (bucket_id = 'narration-audio');

-- 7. SEED INITIAL 10 PPDT SCENARIOS
insert into public.ppdt_scenarios (id, title, difficulty, is_free, scene_preset, expected_characters, key_cues, recommended_story, olq_highlights)
values
  (1, 'PPDT #01 — Village Community Briefing', 'Standard', true, 'village_panchayat', 5, array['Central standing speaker', 'Seated villagers', 'Rural outdoor setting'], 'Rohan, a 24-year-old Block Development Officer posted in Rampur, noticed recurring monsoon waterlogging damaging standing crops and blocking the school road. He convened a morning gram sabha meeting with village elders and youth volunteers. Dividing the team into three groups, he mapped natural drainage slopes, arranged excavation tools from the panchayat store, and led a two-day shramdaan drive to desilt the main canal. He also got low-cost soak pits dug near handpumps. Before heavy rains arrived, water flow stabilized, crop loss was prevented, and villagers formed a permanent maintenance committee.', array['Organizing Ability', 'Social Adaptability', 'Initiative']),
  (2, 'PPDT #02 — Flash Flood River Rescue', 'High-Pressure', true, 'flood_rescue', 4, array['Rising water level', 'Stranded person near bank', 'Team with rope'], 'Lt. Vikram, 25, returning from a route reconnaissance patrol near Teesta river, spotted a sudden upstream cloudburst surge trapping two fishermen on a mid-stream sandbar. Assessing the fast current, he immediately alerted the nearest civil rescue post via radio and gathered thick nylon ropes and empty sealed drums from a nearby camp. Anchoring the line around a sturdy boulder with three trained swimmers, Vikram waded in wearing an improvised float, secured life-loops around both fishermen, and guided them safely to shore before administering warm fluids and first aid.', array['Courage', 'Quick Decision Making', 'Resourcefulness']),
  (3, 'PPDT #03 — Night Highway Accident Aid', 'High-Pressure', false, 'road_accident', 4, array['Overturned vehicle', 'Headlight glare', 'Bystanders'], 'Ananya, a 23-year-old resident doctor driving back from hospital duty, witnessed a delivery van skid off a poorly lit highway curve. Stopping her car safely ahead with hazard lights blinking, she placed reflective warning triangles 50 meters back to prevent pile-ups. She directed two bystanders to dial 108 ambulance and highway patrol while she checked the injured driver for spinal trauma, controlled bleeding with her emergency kit, and kept him conscious. Within 15 minutes the ambulance arrived, and her timely stabilization ensured a full recovery.', array['Sense of Responsibility', 'Presence of Mind', 'Cooperation']),
  (4, 'PPDT #04 — Hill Terrain Survey Team', 'Standard', false, 'forest_survey', 3, array['Elevated ridge', 'Maps and instruments', 'Two colleagues observing'], 'Arjun, a 24-year-old civil engineer with the Border Roads task force, was tasked with finalizing a safe alignment for an all-weather link road in Chamoli. Studying contour maps and soil stability on site with two junior surveyors, he spotted loose shale prone to landslides along the lower valley route. He proposed shifting the alignment 120 meters higher along a solid granite ridge, calculated gradient tolerances, and presented a cost-neutral revised blueprint to his Commanding Officer. The new alignment was approved and completed two weeks ahead of schedule.', array['Effective Intelligence', 'Reasoning Ability', 'Determination']),
  (5, 'PPDT #05 — Railway Platform Medical Emergency', 'Ambiguous', false, 'railway_platform', 4, array['Crowded station platform', 'Elderly passenger seated', 'Luggage'], 'Karan, a 22-year-old NCC Senior Under Officer waiting at Jhansi junction, noticed an elderly passenger clutching his chest and sweating profusely on a platform bench. Asking his co-traveller to notify the Station Master and Railway Medical Room, Karan loosened the man''s collar, cleared the surrounding crowd for fresh air, and checked his bag for prescribed nitroglycerin tablets. When the railway medical team arrived with a stretcher, Karan handed over the passenger''s medicine slip and contacted his son via his phone''s emergency contact, ensuring prompt hospital admission.', array['Social Effectiveness', 'Speed of Decision', 'Empathy']),
  (6, 'PPDT #06 — Hostel Fire Drill & Evacuation', 'High-Pressure', false, 'urban_smoke', 4, array['Smoke from building window', 'Students moving outside', 'Leader gesturing'], 'Siddharth, 21, Hostel Prefect at his engineering college, smelled electrical smoke rising from the ground-floor meter room late at night. Staying calm, he sounded the corridor fire alarm, switched off the main floor breaker, and instructed floor captains to guide sleepy students down the rear staircase in single file without using lifts. Using the corridor CO2 extinguisher, he contained the sparks before they reached wooden furniture until the fire brigade arrived. Every resident was accounted for at the assembly ground with zero injuries.', array['Courage', 'Leadership', 'Stamina']),
  (7, 'PPDT #07 — Rural Digital Literacy Camp', 'Standard', false, 'classroom_group', 5, array['Indoor room', 'Person pointing at board', 'Seated learners'], 'Meera, a 23-year-old computer science graduate visiting her ancestral village during semester break, learned that local farmers were losing money to middlemen due to unfamiliarity with e-NAM mandi prices and UPI safety. She partnered with the local school principal to use the computer lab every evening for two weeks. Designing simple visual charts in Hindi, she trained 45 farmers and shopkeepers to check daily crop rates, verify QR payments, and avoid OTP fraud. Within a month, villagers directly sold produce at 18% better margins.', array['Initiative', 'Social Adaptability', 'Effective Intelligence']),
  (8, 'PPDT #08 — Solitary Desk Late-Night Prep', 'Ambiguous', false, 'solitary_desk', 1, array['Single person seated at table', 'Lamp and papers', 'Focused posture'], 'Aditya, a 22-year-old final-year mechanical student and college robotics lead, discovered a critical weight imbalance in their autonomous rover prototype just 36 hours before the national defence tech challenge. Instead of panicking, he systematically isolated the chassis load distribution on paper, redesigned the battery mount using lightweight aluminum brackets, and coordinated with the workshop technician at 6 AM to fabricate the part. After running three stability trials on uneven terrain, his team cleared inspection and won second place nationally.', array['Determination', 'Reasoning Ability', 'Self-Confidence']),
  (9, 'PPDT #09 — Sports Ground Injury & Match Strategy', 'Standard', false, 'sports_field', 4, array['Open ground', 'Player on turf', 'Teammates huddled'], 'Dev, 21, captain of his university football team, saw his key center-back twist an ankle mid-way through an inter-university semifinal while leading 1-0. Dev immediately signaled the physio, ensured proper ice compression off the field, and huddled his remaining ten players to reorganize into a disciplined 4-4-1 counter-attacking formation. Encouraging the substitute defender with clear marking duties, Dev led from the midfield, maintained team morale under heavy pressure, and sealed a 2-0 victory.', array['Liveliness', 'Group Influencing Ability', 'Cooperation']),
  (10, 'PPDT #10 — Forest Trail Lost Trekker Search', 'High-Pressure', false, 'forest_survey', 3, array['Dense trees and slope', 'Three hikers', 'Pointing toward trail'], 'Nikhil, a 24-year-old mountaineering instructor leading a youth trek in Himachal, noticed fog rolling in and realized two novice trekkers had trailed behind near a fork. Halting the main group at a sheltered rock point under his assistant''s care, Nikhil noted compass bearings, carried a whistle, headlamp, and energy bars, and retraced the upper ridge path. Using periodic whistle blasts, he located both trekkers within 25 minutes before darkness fell and safely guided the entire batch down to base camp.', array['Sense of Responsibility', 'Courage', 'Organizing Ability'])
on conflict (id) do nothing;

select setval('public.ppdt_scenarios_id_seq', (select coalesce(max(id), 10) from public.ppdt_scenarios));
