-- The free allowance of voice messages. Failed attempts are given back.
create table public.voice_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('transcribe', 'parse')),
  uses integer not null default 1,
  seconds numeric not null default 0,
  primary key (user_id, day, kind)
);

alter table public.voice_usage enable row level security;

revoke all on table public.voice_usage from anon, authenticated;

create or replace function public.claim_voice_use(p_user_id uuid, p_kind text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
begin
  select value into v_limit from public.app_config where key = 'voice_daily_limit';

  insert into public.voice_usage (user_id, kind)
  select p_user_id, p_kind
  where v_limit > 0
  on conflict (user_id, day, kind) do update
    set uses = public.voice_usage.uses + 1
    where public.voice_usage.uses < v_limit;
  return found;
end;
$$;

create or replace function public.release_voice_use(p_user_id uuid, p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.voice_usage
  set uses = greatest(uses - 1, 0)
  where user_id = p_user_id and day = current_date and kind = p_kind;
$$;

-- Deepgram bills by the minute, and fake accounts multiply the daily limit.
create or replace function public.voice_budget_reached()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(seconds), 0) >= coalesce(
    (select value * 60 from public.app_config where key = 'voice_daily_minutes'),
    0
  )
  from public.voice_usage
  where day = current_date;
$$;

create or replace function public.record_voice_seconds(p_user_id uuid, p_seconds numeric)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.voice_usage (user_id, kind, uses, seconds)
  values (p_user_id, 'transcribe', 0, greatest(p_seconds, 0))
  on conflict (user_id, day, kind) do update
    set seconds = public.voice_usage.seconds + excluded.seconds;
$$;

select cron.schedule(
  'purge-voice-usage',
  '23 3 * * *',
  $$delete from public.voice_usage where day < current_date - 1$$
);
