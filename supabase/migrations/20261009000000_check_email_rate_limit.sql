-- Vaitu · rate limit the unauthenticated check-email endpoint.
-- That endpoint answers "is there an account for this address?", so left
-- unthrottled it is a user-enumeration oracle: anyone can walk the whole
-- address space at line rate and build a list of who has an account.
-- Count attempts per hashed client IP in a fixed window; the edge function
-- asks check_email_rate_limit() before it does anything else.

create table public.check_email_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.check_email_rate_limits enable row level security;
-- No policies on purpose: anon/authenticated get no grants, so the only
-- caller is the service role inside the edge function.

revoke all on table public.check_email_rate_limits from anon, authenticated;

-- One atomic call per attempt: insert-or-bump and report the new count.
-- Returns false once the window is exhausted.
create or replace function public.check_email_rate_limit(p_ip_hash text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window interval := interval '15 minutes';
  v_max integer := 20;
  v_attempts integer;
begin
  if p_ip_hash is null or p_ip_hash = '' then
    return false;
  end if;

  insert into public.check_email_rate_limits (ip_hash, window_start, attempts)
  values (p_ip_hash, now(), 1)
  on conflict (ip_hash) do update
    set attempts = case
          when public.check_email_rate_limits.window_start < now() - v_window then 1
          else public.check_email_rate_limits.attempts + 1
        end,
        window_start = case
          when public.check_email_rate_limits.window_start < now() - v_window then now()
          else public.check_email_rate_limits.window_start
        end
  returning attempts into v_attempts;

  return v_attempts <= v_max;
end;
$$;

-- Windows expire on their own; sweep them hourly so the table stays small.
select cron.schedule(
  'purge-check-email-rate-limits',
  '17 * * * *',
  $$delete from public.check_email_rate_limits
    where window_start < now() - interval '1 day'$$
);