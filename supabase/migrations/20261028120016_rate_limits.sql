-- Limits on what the edge functions do on behalf of anyone, and the alerts to
-- the owner when they are hit.

create table public.check_email_rate_limits (
  ip_hash text primary key,
  window_start timestamptz not null default now(),
  attempts integer not null default 0
);

alter table public.check_email_rate_limits enable row level security;
-- No policies on purpose: anon/authenticated get no grants, so the only
-- caller is the service role inside the edge function.

revoke all on table public.check_email_rate_limits from anon, authenticated;

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

create function public.account_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from auth.users where email = p_email);
$$;

select cron.schedule(
  'purge-check-email-rate-limits',
  '17 * * * *',
  $$delete from public.check_email_rate_limits
    where window_start < now() - interval '1 day'$$
);


-- When each alert to the owner last went out, so a limit that every user hits
-- sends one email a day. No policies: only the service role gets here.
create table public.alert_log (
  key text primary key,
  last_sent_at timestamptz not null default now()
);

alter table public.alert_log enable row level security;

revoke all on table public.alert_log from anon, authenticated;

create or replace function public.claim_alert(p_key text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.alert_log (key)
  values (p_key)
  on conflict (key) do update
    set last_sent_at = now()
    where public.alert_log.last_sent_at < now() - interval '1 day';
  return found;
end;
$$;
