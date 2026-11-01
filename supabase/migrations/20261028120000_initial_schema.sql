-- Vaitu · initial schema. Access is ownership: events.sender_id,
-- applications.applicant_id.
-- - profiles is own-row only; the poster's name comes from event_poster_name().
-- - Deadlines close events through close_expired_events() on pg_cron: triggers
-- cannot fire on time.
-- - Event policies must NOT select profiles under RLS: it recurses through the
-- applicants policy. is_active_profile() is security definer for this.
-- - RLS picks the rows a client may update, column grants pick the columns.
-- - Withdrawals and deleted events stay as rows: they are other people's
-- history and a user's track record, which profile_stats() scores. Everything
-- personal in a deleted event is wiped, and RLS hides it.
-- - Functions are callable only where granted: by default anon could call
-- security definer ones.

create extension if not exists pg_cron;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;
grant execute on function public.immutable_unaccent(text) to authenticated;
create extension if not exists pg_net with schema extensions;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  website text,
  phone text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  favorite_regions text[] not null default '{}',
  interested_job_types text[] not null default '{}',
  professions text[] not null default '{}',
  locale text,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  deactivated_at timestamptz,
  is_email_opted_out boolean not null default false,
  onboarded_at timestamptz,
  has_new_event_alerts boolean not null default true
);

comment on column public.profiles.interested_job_types is
  'Job types the feed shows by default. Empty means all of them.';
comment on column public.profiles.professions is
  'Trades the feed shows by default. Empty means every trade.';
comment on column public.profiles.is_active is
  'False after the user deactivates; true again on the next successful login.';
comment on column public.profiles.last_login_at is
  'Updated on each successful session (including reactivation).';
comment on column public.profiles.deactivated_at is
  'When the user last chose Deactivate account; cleared on reactivation.';
comment on column public.profiles.is_email_opted_out is
  'When true, do not send re-engagement (or other marketing) email.';
comment on column public.profiles.onboarded_at is
  'When the user finished or skipped onboarding; null while it is still owed.';
comment on column public.profiles.has_new_event_alerts is
  'Whether a new event matching the user''s trades and regions notifies them.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reads is_active without RLS (avoids events ↔ profiles policy recursion).
create or replace function public.is_active_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_active from public.profiles p where p.id = profile_id),
    false
  );
$$;

grant execute on function public.is_active_profile(uuid) to anon, authenticated;

-- Reactivation is its own guarded update: boot and the auth listener race to
-- call this, and the row lock lets only one report true.
create function public.touch_login()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  update public.profiles
  set last_login_at = now(), updated_at = now()
  where id = auth.uid();

  update public.profiles
  set is_active = true, deactivated_at = null
  where id = auth.uid() and not is_active;

  if not found then
    return false;
  end if;

  -- Back on the account, so the link in the deactivation email stops working.
  delete from public.account_erasures where user_id = auth.uid();
  return true;
end;
$$;

grant execute on function public.touch_login() to authenticated;


create table public.events (
  id uuid primary key default gen_random_uuid(),
  -- Null once the sender erased their account: the row is anonymous history.
  sender_id uuid references public.profiles (id) on delete set null,
  category text not null default 'wedding',
  profession text not null,
  job_type text generated always as (category || '_' || profession) stored,
  title text not null,
  location text not null,
  country text not null,
  region text not null,
  event_date date not null,
  application_deadline timestamptz not null,
  max_applicants integer not null default 5 check (max_applicants > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'assigned')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  image_urls text[] not null default '{}',
  deleted_at timestamptz,
  outcome_requested_at timestamptz,
  search_text text generated always as (
    public.immutable_unaccent(lower(
      title || ' ' || location || ' ' || region || ' ' ||
      coalesce(details ->> 'spouse_first_name_1', '') || ' ' ||
      coalesce(details ->> 'spouse_first_name_2', '') || ' ' ||
      coalesce(details ->> 'headliner', '')
    ))
  ) stored
);

create index events_sender_id_idx on public.events (sender_id);
create index events_browse_idx on public.events (status, region, event_date);
create index events_category_idx on public.events (category);
create index events_job_type_idx on public.events (job_type);
create index events_search_idx on public.events
  using gin (search_text extensions.gin_trgm_ops);
create index events_details_gin_idx on public.events using gin (details);
create index events_details_style_idx on public.events ((details ->> 'style'));
create index events_details_genre_idx on public.events ((details ->> 'genre'));


create table public.applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  -- Null once the applicant erased their account: [Deleted User] in the app.
  applicant_id uuid references public.profiles (id) on delete set null,
  motivation text not null,
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'selected', 'rejected', 'withdrawn')),
  status_before_assign text
    check (status_before_assign in ('pending', 'shortlisted')),
  -- Null on a withdrawn row means deactivation withdrew it, not the applicant.
  withdrawn_from text
    check (withdrawn_from in ('pending', 'shortlisted', 'selected', 'rejected')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index applications_one_live_per_event
  on public.applications (event_id, applicant_id)
  where status <> 'withdrawn';
create index applications_event_id_idx on public.applications (event_id);
create index applications_applicant_id_idx on public.applications (applicant_id);
create index applications_event_status_idx on public.applications (event_id, status);

-- Filtered realtime evaluates UPDATE/DELETE filters only when the full row is
-- replicated; otherwise filtered channels stay silent.
alter table public.events replica identity full;
alter table public.applications replica identity full;


create table public.app_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('points_per_completed_job', 20, 'Points per job the organizer confirmed as done.'),
  ('review_good_min_stars', 4, 'Stars from which a review counts as good.'),
  ('review_poor_max_stars', 2, 'Stars up to which a review counts as poor.'),
  ('points_per_good_review', 5, 'Points per good review.'),
  ('points_per_poor_review', -10, 'Points per poor review.'),
  ('points_per_dropout', -15, 'Points per job withdrawn from after winning it.'),
  ('points_per_no_show', -30, 'Points per job the organizer reported as a no-show.'),
  ('tier_bronze_min_points', 25, 'Minimum points for bronze tier.'),
  ('tier_silver_min_points', 100, 'Minimum points for silver tier.'),
  ('tier_gold_min_points', 250, 'Minimum points for gold tier.'),
  ('badge_serial_applicant_min_applications', 10, 'Applications for the Serial Applicant badge.'),
  ('badge_serial_withdrawer_min_withdrawals', 3, 'Withdrawals for the Serial Withdrawer badge.'),
  ('badge_serial_withdrawer_min_percent', 33, 'Share of applications withdrawn for the Serial Withdrawer badge.'),
  ('badge_unreliable_min_failures', 2, 'Dropouts plus no-shows for the Unreliable badge.'),
  ('badge_reliable_min_jobs', 3, 'Completed jobs, with no failures, for the Reliable badge.'),
  ('badge_top_rated_min_reviews', 3, 'Reviews for the Top Rated badge.'),
  ('badge_top_rated_min_tenths', 45, 'Average rating, in tenths of a star, for the Top Rated badge.'),
  ('badge_generous_min_handoffs', 3, 'Jobs handed off for the Generous Colleague badge.'),
  ('voice_daily_limit', 3, 'Voice messages a user can transcribe, and parse, per day.'),
  ('reports_daily_limit', 5, 'Reports a user can send per day.');


create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  -- The blocker may no longer be allowed to read the blocked person's profile.
  blocked_name text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- Either way round: a block keeps both people apart.
create or replace function public.are_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_first and blocked_id = p_second)
       or (blocker_id = p_second and blocked_id = p_first)
  );
$$;

grant execute on function public.are_blocked(uuid, uuid) to anon, authenticated;

create or replace function public.enforce_application_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  select * into v_event
  from public.events
  where id = new.event_id;

  if not found then
    raise exception 'Event does not exist.';
  end if;

  if v_event.sender_id = new.applicant_id then
    raise exception 'You cannot apply to your own event.';
  end if;

  if v_event.deleted_at is not null then
    raise exception 'Event does not exist.';
  end if;

  if public.are_blocked(v_event.sender_id, new.applicant_id) then
    raise exception 'You cannot apply to this event.';
  end if;

  if v_event.status <> 'open' then
    raise exception 'Event is not open for applications (status=%).', v_event.status;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_event.sender_id and is_active
  ) then
    raise exception 'The account behind this event has been deactivated.';
  end if;

  if now() > v_event.application_deadline then
    raise exception 'Application deadline has passed.';
  end if;

  return new;
end;
$$;

create trigger trg_applications_rules
  before insert on public.applications
  for each row execute function public.enforce_application_rules();

create or replace function public.enforce_selection_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_count integer;
begin
  if new.status <> 'shortlisted' then
    return new;
  end if;

  -- A shortlist given back after the winner withdrew fitted when it was
  -- made: a cap lowered since must not stop the withdrawal.
  if current_setting('vaitu.restoring', true) = 'on' then
    return new;
  end if;

  select max_applicants into v_max
  from public.events
  where id = new.event_id;

  select count(*) into v_count
  from public.applications
  where event_id = new.event_id
    and status = 'shortlisted'
    and id <> new.id;

  if v_count >= v_max then
    raise exception 'Shortlist is full (max %).', v_max;
  end if;

  return new;
end;
$$;

create trigger trg_applications_selection_cap
  before insert or update of status on public.applications
  for each row execute function public.enforce_selection_cap();

-- Clients can update their own row, so status changes are guarded here.
-- assign_winner, withdraw_application and retire_profile_activity pass by
-- setting a transaction flag.
create or replace function public.enforce_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'pending' then
      raise exception 'You cannot change this application status.';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if current_setting('vaitu.restoring', true) = 'on'
    or current_setting('vaitu.withdrawing', true) = 'on' then
    return new;
  end if;

  if old.status = 'withdrawn' or new.status = 'withdrawn' then
    raise exception 'You cannot change this application status.';
  end if;

  -- A decision taken after the assignment is the sender's: a withdrawing
  -- winner must not undo it.
  if current_setting('vaitu.assigning', true) is distinct from 'on' then
    new.status_before_assign := null;
  end if;

  select sender_id into v_sender_id
  from public.events
  where id = new.event_id;

  if auth.uid() = v_sender_id and new.status in ('pending', 'shortlisted', 'rejected') then
    return new;
  end if;

  if auth.uid() = v_sender_id
    and new.status = 'selected'
    and current_setting('vaitu.assigning', true) = 'on' then
    return new;
  end if;

  raise exception 'You cannot change this application status.';
end;
$$;

create trigger trg_applications_status_change
  before insert or update of status on public.applications
  for each row execute function public.enforce_application_status_change();

create or replace function public.enforce_motivation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.motivation is not distinct from old.motivation
    or current_setting('vaitu.withdrawing', true) = 'on' then
    return new;
  end if;

  if auth.uid() = new.applicant_id
    and old.status in ('pending', 'shortlisted') then
    return new;
  end if;

  raise exception 'You cannot change this motivation.';
end;
$$;

create trigger trg_applications_motivation_change
  before update of motivation on public.applications
  for each row execute function public.enforce_motivation_change();

create or replace function public.assign_winner(p_event_id uuid, p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_id uuid;
  v_status text;
begin
  select sender_id into v_sender_id
  from public.events
  where id = p_event_id and deleted_at is null;

  if not found then
    raise exception 'Event does not exist.';
  end if;

  if v_sender_id <> auth.uid() then
    raise exception 'Only the event owner can assign a winner.';
  end if;

  select status into v_status
  from public.applications
  where id = p_application_id and event_id = p_event_id;

  if not found then
    raise exception 'Application does not belong to this event.';
  end if;

  if v_status <> 'shortlisted' then
    raise exception 'Winner must come from the shortlist.';
  end if;

  update public.events
  set status = 'assigned', updated_at = now()
  where id = p_event_id;

  perform set_config('vaitu.assigning', 'on', true);

  update public.applications
  set status = 'selected', updated_at = now()
  where id = p_application_id;

  update public.applications
  set status = 'rejected',
      status_before_assign = status,
      updated_at = now()
  where event_id = p_event_id
    and id <> p_application_id
    and status not in ('rejected', 'withdrawn');
end;
$$;

grant execute on function public.assign_winner(uuid, uuid) to authenticated;

-- Applicants cannot update events (RLS), so the reopen lives here. Only the
-- winner's own withdrawal reopens: deleting the event or deactivating an
-- account must not.
create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_event public.events%rowtype;
begin
  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found
    or v_application.applicant_id is distinct from auth.uid()
    or v_application.status = 'withdrawn' then
    raise exception 'Application does not exist.';
  end if;

  if exists (
    select 1 from public.job_reviews where application_id = p_application_id
  ) then
    raise exception 'This job has already been reviewed.';
  end if;

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications
  set status = 'withdrawn',
      withdrawn_from = v_application.status,
      withdrawn_at = now(),
      status_before_assign = null
  where id = p_application_id;
  perform set_config('vaitu.withdrawing', 'off', true);

  select * into v_event
  from public.events
  where id = v_application.event_id;

  perform public.notify_user(
    v_event.sender_id,
    'application_withdrawn',
    v_event.id,
    null,
    (select full_name from public.profiles where id = v_application.applicant_id)
  );

  if v_application.status <> 'selected' then
    return;
  end if;

  perform set_config('vaitu.restoring', 'on', true);
  update public.applications
  set status = status_before_assign,
      status_before_assign = null
  where event_id = v_event.id
    and status = 'rejected'
    and status_before_assign is not null;
  perform set_config('vaitu.restoring', 'off', true);

  if v_event.status <> 'assigned'
    or v_event.deleted_at is not null
    or v_event.application_deadline <= now()
    or exists (
      select 1 from public.applications
      where event_id = v_event.id and status = 'selected'
    ) then
    return;
  end if;

  update public.events
  set status = 'open'
  where id = v_event.id;
end;
$$;

grant execute on function public.withdraw_application(uuid) to authenticated;

create or replace function public.close_expired_events()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed integer;
begin
  update public.events
  set status = 'closed', updated_at = now()
  where status = 'open'
    and deleted_at is null
    and application_deadline < now();

  get diagnostics v_closed = row_count;
  return v_closed;
end;
$$;

-- Time alone never touches a row, so realtime can only fire after this flips
-- expired statuses.
select cron.schedule(
  'close-expired-events',
  '* * * * *',
  $$select public.close_expired_events()$$
);


create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();


create function public.event_poster_name(p_event_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name
  from public.events e
  join public.profiles p on p.id = e.sender_id
  where e.id = p_event_id
    and e.deleted_at is null
    and (e.status <> 'open' or p.is_active or e.sender_id = auth.uid());
$$;

grant execute on function public.event_poster_name(uuid) to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.app_config enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Senders can view applicants to their events"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.events e on e.id = a.event_id
      where a.applicant_id = public.profiles.id
        and a.status <> 'withdrawn'
        and e.sender_id = auth.uid()
        and e.deleted_at is null
    )
  );

create policy "Anyone can read app config"
  on public.app_config for select to anon, authenticated
  using (true);

create policy "Anyone can view open events"
  on public.events for select to anon, authenticated
  using (
    status = 'open'
    and deleted_at is null
    and public.is_active_profile(sender_id)
    and not public.are_blocked(auth.uid(), sender_id)
  );

create policy "Anyone can view closed events"
  on public.events for select to anon, authenticated
  using (status <> 'open' and deleted_at is null);

create policy "Senders can view their own events"
  on public.events for select to authenticated
  using (sender_id = auth.uid() and deleted_at is null);

create policy "Users can create their own events"
  on public.events for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

create policy "Senders can update their own events"
  on public.events for update to authenticated
  using (
    sender_id = auth.uid()
    and deleted_at is null
    and public.is_active_profile(auth.uid())
  )
  with check (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

create policy "Applicants can view their own applications"
  on public.applications for select to authenticated
  using (applicant_id = auth.uid());

create policy "Senders can view applications to their events"
  on public.applications for select to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = applications.event_id
        and e.sender_id = auth.uid()
    )
  );

create policy "Applicants can apply to events"
  on public.applications for insert to authenticated
  with check (applicant_id = auth.uid());

create policy "Applicants can update their own applications"
  on public.applications for update to authenticated
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

create policy "Senders can update applications to their events"
  on public.applications for update to authenticated
  using (
    exists (
      select 1 from public.events e
      where e.id = applications.event_id
        and e.sender_id = auth.uid()
    )
  );


-- Supabase grants every privilege by default and policies only pick rows:
-- without these column grants an owner could rewrite any column.
grant select on public.app_config to anon, authenticated;

grant select on public.events to anon, authenticated;

create or replace function public.open_event_regions(
  job_types text[] default '{}'
)
returns setof text
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct e.region
  from public.events e
  where e.status = 'open'
    and (auth.uid() is null or e.sender_id <> auth.uid())
    and (cardinality(job_types) = 0 or e.job_type = any (job_types))
$$;

grant execute on function public.open_event_regions(text[])
  to anon, authenticated;
revoke delete, update on public.events from anon, authenticated;
grant insert on public.events to authenticated;
grant update (
  category,
  profession,
  title,
  location,
  country,
  region,
  event_date,
  application_deadline,
  max_applicants,
  status,
  details,
  updated_at,
  image_urls
) on public.events to authenticated;

revoke insert, update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name,
  website,
  phone,
  country,
  favorite_regions,
  interested_job_types,
  professions,
  locale,
  avatar_url,
  onboarded_at,
  is_email_opted_out,
  has_new_event_alerts
) on public.profiles to authenticated;

revoke insert, update, delete on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant insert (event_id, applicant_id, motivation)
  on public.applications to authenticated;
grant update (status, motivation) on public.applications to authenticated;


create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'application_received',
      'application_selected',
      'application_rejected',
      'application_withdrawn',
      'event_updated',
      'event_closed',
      'new_event',
      'job_outcome_due',
      'job_reviewed',
      'job_cancelled'
    )
  ),
  event_id uuid references public.events (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  applicant_name text,
  -- Only when the event is gone, so its title cannot come from the event.
  event_title text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  -- Exactly-once claim for push-notify: null -> now() under READ COMMITTED.
  pushed_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
create index notifications_created_idx on public.notifications (created_at);

alter table public.notifications enable row level security;

create policy "Users read their own notifications"
  on public.notifications for select to authenticated
  using (auth.uid() = user_id);

create policy "Users mark their own notifications read"
  on public.notifications for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete their own notifications"
  on public.notifications for delete to authenticated
  using (auth.uid() = user_id);

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- Security definer, so no client writes notifications. Skips absent,
-- deactivated and self-notified users.
create or replace function public.notify_user(
  p_user uuid,
  p_type text,
  p_event uuid default null,
  p_application uuid default null,
  p_applicant_name text default null,
  p_event_title text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then return; end if;
  if p_user = auth.uid() then return; end if;
  if not exists (
    select 1 from public.profiles
    where id = p_user and is_active
  ) then return; end if;
  insert into public.notifications
    (user_id, type, event_id, application_id, applicant_name, event_title)
  values (p_user, p_type, p_event, p_application, p_applicant_name, p_event_title);
end;
$$;

create or replace function public.vaitu_on_application_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    (
      select sender_id from public.events where id = new.event_id
    ),
    'application_received',
    new.event_id,
    new.id
  );
  return new;
end;
$$;

create trigger trg_application_received
  after insert on public.applications
  for each row execute function public.vaitu_on_application_received();

create or replace function public.vaitu_on_application_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    new.applicant_id,
    case new.status
      when 'selected' then 'application_selected'
      else 'application_rejected'
    end,
    new.event_id,
    new.id
  );
  return new;
end;
$$;

create trigger trg_application_decided
  after update of status on public.applications
  for each row
  when (old.status is distinct from new.status
        and new.status in ('selected', 'rejected'))
  execute function public.vaitu_on_application_decided();

create or replace function public.vaitu_on_event_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := case new.status
    when 'closed' then 'event_closed'
    else 'event_updated'
  end;
begin
  perform public.notify_user(
    a.applicant_id,
    v_type,
    new.id
  )
  from public.applications a
  where a.event_id = new.id
    and a.status in ('pending', 'selected')
    and a.applicant_id <> new.sender_id;
  return new;
end;
$$;

create trigger trg_event_changed
  after update of title, location, country, region, event_date,
                   application_deadline, details, status
  on public.events
  for each row
  when (
    new.deleted_at is null
    and (
    old.title is distinct from new.title
    or old.location is distinct from new.location
    or old.country is distinct from new.country
    or old.region is distinct from new.region
    or old.event_date is distinct from new.event_date
    or old.application_deadline is distinct from new.application_deadline
    or old.details is distinct from new.details
    or old.status is distinct from new.status
    )
  )
  execute function public.vaitu_on_event_changed();

-- Only someone who named their trades hears about new events: an empty list
-- means "show me everything" in the feed, which is not a wish for a push per
-- event. Regions are compared as written: normalizeEvent stores the canonical
-- name, the one favorites use.
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
    and p.has_new_event_alerts
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

create trigger trg_event_created
  after insert on public.events
  for each row execute function public.vaitu_on_event_created();


-- What the organizer reports once the event date has come: whether the winner
-- did the job, and how well. One review per job, written once, and only by the
-- organizer: nothing in here is the winner's to change.
create table public.job_reviews (
  application_id uuid primary key references public.applications (id) on delete cascade,
  outcome text not null check (outcome in ('completed', 'no_show', 'cancelled')),
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  -- Set by moderation: the comment stops showing, the rating still counts.
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check ((outcome = 'completed') = (rating is not null)),
  check (outcome = 'completed' or comment is null)
);

alter table public.job_reviews enable row level security;

create policy "Both sides of a job can read its review"
  on public.job_reviews for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.events e on e.id = a.event_id
      where a.id = job_reviews.application_id
        and (a.applicant_id = auth.uid() or e.sender_id = auth.uid())
    )
  );

revoke all on public.job_reviews from anon, authenticated;
grant select on public.job_reviews to authenticated;

create or replace function public.submit_job_review(
  p_application_id uuid,
  p_outcome text,
  p_rating integer default null,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_event public.events%rowtype;
begin
  select * into v_application
  from public.applications
  where id = p_application_id;

  if not found then
    raise exception 'Application does not exist.';
  end if;

  select * into v_event
  from public.events
  where id = v_application.event_id and deleted_at is null;

  if not found or v_event.sender_id is distinct from auth.uid() then
    raise exception 'Only the event owner can review this job.';
  end if;

  if v_application.status <> 'selected' then
    raise exception 'Only the winner can be reviewed.';
  end if;

  if v_event.event_date > current_date then
    raise exception 'A job can be reviewed once its date has come.';
  end if;

  insert into public.job_reviews (application_id, outcome, rating, comment)
  values (p_application_id, p_outcome, p_rating, nullif(trim(p_comment), ''));

  if p_outcome <> 'cancelled' then
    perform public.notify_user(
      v_application.applicant_id,
      'job_reviewed',
      v_event.id,
      p_application_id
    );
  end if;
end;
$$;

grant execute on function public.submit_job_review(uuid, text, integer, text)
  to authenticated;

create or replace function public.request_job_outcomes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due record;
  v_requested integer := 0;
begin
  for v_due in
    update public.events e
    set outcome_requested_at = now()
    where e.status = 'assigned'
      and e.deleted_at is null
      and e.outcome_requested_at is null
      and e.event_date < current_date
      and exists (
        select 1
        from public.applications a
        where a.event_id = e.id
          and a.status = 'selected'
          and not exists (
            select 1 from public.job_reviews r where r.application_id = a.id
          )
      )
    returning e.id, e.sender_id
  loop
    perform public.notify_user(v_due.sender_id, 'job_outcome_due', v_due.id);
    v_requested := v_requested + 1;
  end loop;
  return v_requested;
end;
$$;

select cron.schedule(
  'request-job-outcomes',
  '7 * * * *',
  $$select public.request_job_outcomes()$$
);

-- Security definer: your applicants' records must count all their history, not
-- the part RLS shows you. You can read your own, and that of people applying
-- to your events.
create or replace function public.can_read_reputation(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.applications a
      join public.events e on e.id = a.event_id
      where a.applicant_id = p_profile_id
        and a.status <> 'withdrawn'
        and e.sender_id = auth.uid()
        and e.deleted_at is null
    );
$$;

create or replace function public.profile_stats(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  applications_count bigint,
  shortlists_count bigint,
  selections_count bigint,
  completed_count bigint,
  review_count bigint,
  average_rating numeric,
  points bigint,
  tier text,
  badges text[]
)
language sql
stable
security definer
set search_path = public
as $$
  with config as (
    select jsonb_object_agg(key, value) as c from public.app_config
  ),
  counted as (
    select
      p.id as profile_id,
      count(a.id) filter (
        where a.status <> 'withdrawn' and e.deleted_at is null
      ) as applications_count,
      count(a.id) filter (
        where a.status = 'shortlisted' and e.deleted_at is null
      ) as shortlists_count,
      count(a.id) filter (
        where a.status = 'selected' and e.deleted_at is null
      ) as selections_count,
      count(a.id) filter (where a.withdrawn_from is not null or a.status <> 'withdrawn') as lifetime_applications,
      count(a.id) filter (
        where a.withdrawn_from in ('pending', 'shortlisted', 'selected')
      ) as withdrawals,
      count(a.id) filter (where a.withdrawn_from = 'selected') as dropouts,
      count(r.application_id) filter (where r.outcome = 'completed') as completed_count,
      count(r.application_id) filter (where r.outcome = 'no_show') as no_shows,
      count(r.application_id) filter (
        where r.rating >= (config.c ->> 'review_good_min_stars')::int
      ) as good_reviews,
      count(r.application_id) filter (
        where r.rating <= (config.c ->> 'review_poor_max_stars')::int
      ) as poor_reviews,
      count(r.rating) as review_count,
      round(avg(r.rating), 1) as average_rating
    from config, unnest(p_profile_ids) as requested (id)
    join public.profiles p on p.id = requested.id
    left join public.applications a on a.applicant_id = p.id
    left join public.events e on e.id = a.event_id
    left join public.job_reviews r on r.application_id = a.id
    where public.can_read_reputation(p.id)
    group by p.id, config.c
  ),
  scored as (
    select
      counted.*,
      (
        select count(*)
        from public.events handed
        where handed.sender_id = counted.profile_id and handed.status = 'assigned'
      ) as handoffs,
      greatest(
        0,
        completed_count * (c ->> 'points_per_completed_job')::int
          + good_reviews * (c ->> 'points_per_good_review')::int
          + poor_reviews * (c ->> 'points_per_poor_review')::int
          + dropouts * (c ->> 'points_per_dropout')::int
          + no_shows * (c ->> 'points_per_no_show')::int
      ) as points,
      c
    from counted, config
  )
  select
    profile_id,
    applications_count,
    shortlists_count,
    selections_count,
    completed_count,
    review_count,
    average_rating,
    points,
    case
      when points >= (c ->> 'tier_gold_min_points')::int then 'gold'
      when points >= (c ->> 'tier_silver_min_points')::int then 'silver'
      when points >= (c ->> 'tier_bronze_min_points')::int then 'bronze'
    end as tier,
    array_remove(array[
      case when review_count >= (c ->> 'badge_top_rated_min_reviews')::int
        and average_rating * 10 >= (c ->> 'badge_top_rated_min_tenths')::int
        then 'top_rated' end,
      case when completed_count >= (c ->> 'badge_reliable_min_jobs')::int
        and dropouts + no_shows = 0
        then 'reliable' end,
      case when handoffs >= (c ->> 'badge_generous_min_handoffs')::int
        then 'generous' end,
      case when lifetime_applications >= (c ->> 'badge_serial_applicant_min_applications')::int
        then 'serial_applicant' end,
      case when withdrawals >= (c ->> 'badge_serial_withdrawer_min_withdrawals')::int
        and withdrawals * 100 >= lifetime_applications * (c ->> 'badge_serial_withdrawer_min_percent')::int
        then 'serial_withdrawer' end,
      case when dropouts + no_shows >= (c ->> 'badge_unreliable_min_failures')::int
        then 'unreliable' end
    ], null) as badges
  from scored;
$$;

grant execute on function public.profile_stats(uuid[]) to authenticated;

create or replace function public.profile_reviews(p_profile_ids uuid[])
returns table (
  profile_id uuid,
  application_id uuid,
  rating smallint,
  comment text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ranked.profile_id,
    ranked.application_id,
    ranked.rating,
    ranked.comment,
    ranked.created_at
  from (
    select
      a.applicant_id as profile_id,
      r.application_id,
      r.rating,
      r.comment,
      r.created_at,
      row_number() over (
        partition by a.applicant_id order by r.created_at desc
      ) as position
    from unnest(p_profile_ids) as requested (id)
    join public.applications a on a.applicant_id = requested.id
    join public.job_reviews r on r.application_id = a.id
    where r.outcome = 'completed'
      and r.comment is not null
      and r.hidden_at is null
      and public.can_read_reputation(requested.id)
  ) ranked
  where ranked.position <= 5
  order by ranked.created_at desc;
$$;

grant execute on function public.profile_reviews(uuid[]) to authenticated;

-- Deleting removes what the event says, not that it happened. With nobody
-- involved there is no history to keep, so the row goes. Whoever is still
-- counting on an upcoming event hears it is off.
create or replace function public.retire_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if not exists (
    select 1 from public.applications where event_id = p_event_id
  ) then
    delete from public.events where id = p_event_id;
    return;
  end if;

  delete from public.notifications where event_id = p_event_id;

  select title into v_title from public.events where id = p_event_id;

  perform public.notify_user(
    a.applicant_id,
    'job_cancelled',
    null,
    null,
    null,
    v_title
  )
  from public.applications a
  join public.events e on e.id = a.event_id
  where a.event_id = p_event_id
    and a.status in ('pending', 'shortlisted', 'selected')
    and e.event_date >= current_date;

  update public.events
  set deleted_at = now(),
      title = '',
      location = '',
      details = '{}'::jsonb,
      image_urls = '{}'
  where id = p_event_id;
end;
$$;

create or replace function public.delete_event(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.events
    where id = p_event_id
      and sender_id = auth.uid()
      and deleted_at is null
      and public.is_active_profile(auth.uid())
  ) then
    raise exception 'Only the event owner can delete this event.';
  end if;

  perform public.retire_event(p_event_id);
end;
$$;

grant execute on function public.delete_event(uuid) to authenticated;

-- Deactivating takes a user out of what is still undecided or ahead. Only a
-- winner abandoning a job counts against them: the other withdrawals were not
-- their choice to make one by one, so they keep withdrawn_from null. Called by
-- the deactivate-account edge function.
create or replace function public.retire_profile_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_abandoned record;
begin
  perform set_config('vaitu.withdrawing', 'on', true);

  for v_abandoned in
    update public.applications a
    set status = 'withdrawn',
        withdrawn_from = 'selected',
        withdrawn_at = now(),
        status_before_assign = null
    from public.events e
    where e.id = a.event_id
      and a.applicant_id = p_user_id
      and a.status = 'selected'
      and e.deleted_at is null
      and e.event_date >= current_date
      and not exists (
        select 1 from public.job_reviews r where r.application_id = a.id
      )
    returning e.id as event_id, e.sender_id
  loop
    perform public.notify_user(
      v_abandoned.sender_id,
      'application_withdrawn',
      v_abandoned.event_id,
      null,
      (select full_name from public.profiles where id = p_user_id)
    );
  end loop;

  update public.applications
  set status = 'withdrawn',
      withdrawn_at = now(),
      status_before_assign = null
  where applicant_id = p_user_id
    and status in ('pending', 'shortlisted');

  perform set_config('vaitu.withdrawing', 'off', true);

  perform public.retire_event(id)
  from public.events
  where sender_id = p_user_id
    and status = 'open'
    and deleted_at is null;
end;
$$;


create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users can read their own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create function public.save_push_token(
  p_token text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform;
end;
$$;

grant execute on function public.save_push_token(text, text)
  to authenticated;

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

create trigger trg_vaitu_wake_push
  after insert on public.notifications
  for each row execute function public.vaitu_wake_push();


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


-- What the owner receives by email, and acts on: see docs/moderation.md.
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_type text not null check (target_type in ('event', 'user', 'review')),
  event_id uuid references public.events (id) on delete set null,
  reported_user_id uuid references public.profiles (id) on delete set null,
  application_id uuid references public.applications (id) on delete set null,
  reason text not null
    check (reason in ('spam', 'inappropriate', 'fake', 'harassment', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);

create index reports_reporter_idx on public.reports (reporter_id, created_at);

alter table public.reports enable row level security;

revoke all on table public.reports from anon, authenticated;

alter table public.blocks enable row level security;

create policy "Users can read their own blocks"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

create policy "Users can remove their own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

revoke all on table public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;

-- Withdrawn with no withdrawn_from, like deactivation: not the applicant's
-- doing, so it does not count against them.
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is null or p_user_id = auth.uid() then
    raise exception 'You cannot block this user.';
  end if;

  insert into public.blocks (blocker_id, blocked_id, blocked_name)
  values (
    auth.uid(),
    p_user_id,
    (select full_name from public.profiles where id = p_user_id)
  )
  on conflict do nothing;

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications a
  set status = 'withdrawn',
      withdrawn_at = now(),
      status_before_assign = null
  from public.events e
  where e.id = a.event_id
    and e.status = 'open'
    and a.status in ('pending', 'shortlisted')
    and (
      (e.sender_id = auth.uid() and a.applicant_id = p_user_id)
      or (e.sender_id = p_user_id and a.applicant_id = auth.uid())
    );
  perform set_config('vaitu.withdrawing', 'off', true);
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;

-- Single-use links from the deactivation email. Only the hash is kept, so the
-- table cannot be used to erase anyone.
create table public.account_erasures (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days'
);

alter table public.account_erasures enable row level security;

revoke all on table public.account_erasures from anon, authenticated;

-- Runs however the account goes, so the app, the dashboard and any later tool
-- all leave the same anonymous history behind.
create or replace function public.erase_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.retire_profile_activity(old.id);

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications
  set motivation = ''
  where applicant_id = old.id;
  perform set_config('vaitu.withdrawing', 'off', true);

  perform public.retire_event(id)
  from public.events
  where sender_id = old.id
    and deleted_at is null;

  update public.notifications
  set applicant_name = null
  where applicant_name = old.full_name;

  return old;
end;
$$;

create trigger trg_profile_erased
  before delete on public.profiles
  for each row execute function public.erase_profile_activity();

-- The free allowance of voice messages. Failed attempts are given back.
create table public.voice_usage (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('transcribe', 'parse')),
  uses integer not null default 1,
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

select cron.schedule(
  'purge-voice-usage',
  '23 3 * * *',
  $$delete from public.voice_usage where day < current_date - 1$$
);


-- Raising min_build makes a release mandatory: the native apps carry their web
-- code, so the service worker never updates them.
create table public.app_versions (
  platform text primary key check (platform in ('ios', 'android')),
  min_build integer not null check (min_build >= 1),
  store_url text
);

alter table public.app_versions enable row level security;

create policy "Anyone reads the minimum app versions"
  on public.app_versions for select to anon, authenticated
  using (true);

insert into public.app_versions (platform, min_build, store_url) values
  ('ios', 1, null),
  ('android', 1, 'https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu');


insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-ics', 'event-ics', true, null, null),
  ('event-images', 'event-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Anyone can read event ics"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-ics');

create policy "Users can upload their own ics"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can update their own ics"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Anyone can read event images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-images');

create policy "Senders can upload event images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can update own event images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can delete own event images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Anyone can read avatars"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');

create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );


alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.notifications;
