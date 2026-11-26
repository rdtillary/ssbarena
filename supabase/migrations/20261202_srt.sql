-- Allow SRT attempts in the Vault. Safe to re-run.
alter table public.user_attempts drop constraint if exists user_attempts_attempt_type_check;
alter table public.user_attempts
  add constraint user_attempts_attempt_type_check check (attempt_type in ('PPDT', 'OIR', 'WAT', 'TAT', 'SRT'));
