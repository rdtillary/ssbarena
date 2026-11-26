-- Remembers when each user first got Pro, for the admin graph. Safe to re-run.
alter table public.profiles add column if not exists pro_since timestamptz;

create or replace function public.set_pro_since()
returns trigger as $$
begin
  if new.is_pro and new.pro_since is null then
    if tg_op = 'INSERT' then
      new.pro_since := now();
    elsif not coalesce(old.is_pro, false) then
      new.pro_since := now();
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_set_pro_since on public.profiles;
create trigger profiles_set_pro_since
  before insert or update on public.profiles
  for each row execute function public.set_pro_since();

-- Fill in past Pro users from their first recorded payment.
-- Pro given by hand has no recorded date, so it stays empty.
update public.profiles p
set pro_since = x.first_paid
from (
  select user_id, min(paid_at) as first_paid
  from (
    select user_id, created_at as paid_at from public.payment_orders where status = 'paid'
    union all
    select user_id, created_at from public.subscription_payments
    union all
    select user_id, coalesce(reviewed_at, created_at) from public.upi_payments where status = 'approved'
  ) payments
  group by user_id
) x
where p.id = x.user_id and p.pro_since is null;
