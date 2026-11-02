-- Email joins push as a way to hear about a notification, and each can be
-- turned off for each type. 'all' in a list turns off that channel altogether,
-- including types added later.

alter table public.profiles
  add column muted_email_types text[] not null default '{}',
  add column muted_push_types text[] not null default '{}';

comment on column public.profiles.muted_email_types is
  'Notification types not to email, or ''all''. Essential account emails ignore it.';
comment on column public.profiles.muted_push_types is
  'Notification types not to push, or ''all''.';

update public.profiles
set muted_email_types = '{new_event}', muted_push_types = '{new_event}'
where not has_new_event_alerts;

update public.profiles
set muted_email_types = '{all}'
where is_email_opted_out;

alter table public.profiles
  drop column has_new_event_alerts,
  drop column is_email_opted_out;

grant update (muted_email_types, muted_push_types)
  on public.profiles to authenticated;

-- Exactly-once claim for send-emails, like pushed_at. Rows from before this
-- migration are history: nobody gets emailed about them.
alter table public.notifications add column emailed_at timestamptz;

update public.notifications set emailed_at = now();

create index notifications_unemailed_idx on public.notifications (created_at)
  where emailed_at is null;

-- Whoever turned off both channels gets no row at all, not even in the bell:
-- on a busy trade that would be a feed of jobs they asked not to hear about.
create or replace function public.vaitu_on_event_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'open' or new.application_deadline <= now() then
    return new;
  end if;

  perform public.notify_user(p.id, 'new_event', new.id)
  from public.profiles p
  where p.id <> new.sender_id
    and p.is_active
    and not (
      p.muted_email_types && array['all', 'new_event']
      and p.muted_push_types && array['all', 'new_event']
    )
    and not public.are_blocked(p.id, new.sender_id)
    and new.profession = any (p.professions)
    and (
      cardinality(p.interested_job_types) = 0
      or new.job_type = any (p.interested_job_types)
    )
    and (
      cardinality(p.favorite_regions) = 0
      or new.region = any (p.favorite_regions)
    );
  return new;
end;
$$;

create or replace function public.vaitu_wake_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (
    select 1 from public.push_tokens where user_id = new.user_id
  ) then
    return new;
  end if;

  if exists (
    select 1 from public.profiles
    where id = new.user_id
      and muted_push_types && array['all', new.type]
  ) then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- A push is a courtesy on top of the feed: it never fails the insert.
  raise warning 'vaitu_wake_push: %', sqlerrm;
  return new;
end;
$$;

-- The links in notification emails work signed out, for good, and can only turn
-- emails off. No policies: only the service role gets here.
create table public.email_tokens (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  token text not null unique default gen_random_uuid()::text
);

alter table public.email_tokens enable row level security;

revoke all on table public.email_tokens from anon, authenticated;

create function public.email_recipients(p_user_ids uuid[])
returns table (user_id uuid, email text, token text)
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.email_tokens (user_id)
  select id from public.profiles where id = any (p_user_ids)
  on conflict do nothing;

  return query
  select t.user_id, u.email::text, t.token
  from public.email_tokens t
  join auth.users u on u.id = t.user_id
  where t.user_id = any (p_user_ids);
end;
$$;

create function public.mute_email_type(p_token text, p_type text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set muted_email_types = array_append(
    array_remove(p.muted_email_types, p_type),
    p_type
  )
  from public.email_tokens t
  where t.token = p_token and t.user_id = p.id;
  return found;
end;
$$;

-- Resend's free plan allows 100 emails a day, signup confirmations included, so
-- send-emails stops short of that. No policies: only the service role gets here.
create table public.email_budget (
  day date primary key default current_date,
  sent integer not null default 0
);

alter table public.email_budget enable row level security;

revoke all on table public.email_budget from anon, authenticated;

create function public.count_emails_sent(p_count integer)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.email_budget where day < current_date;
  insert into public.email_budget (day, sent)
  values (current_date, p_count)
  on conflict (day) do update
    set sent = public.email_budget.sent + excluded.sent;
$$;

-- Every five minutes, so updates to one person close together share one email.
create function public.vaitu_wake_emails()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (
    select 1 from public.notifications where emailed_at is null
  ) then
    return;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/send-emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;

select cron.schedule(
  'send-emails',
  '*/5 * * * *',
  $$select public.vaitu_wake_emails()$$
);
