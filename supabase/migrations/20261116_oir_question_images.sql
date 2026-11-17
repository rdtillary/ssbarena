-- Image per OIR question (figure questions). Safe to re-run.
alter table public.oir_questions add column if not exists image_url text;
