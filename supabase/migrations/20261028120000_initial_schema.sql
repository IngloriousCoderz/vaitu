-- Vaitu · initial schema.
--
-- One account posts events and applies to the events of others. What decides
-- access is ownership: events.sender_id for the event, applications.applicant_id
-- for the application.
--
-- Design notes:
--  1. profiles stays private (own-row RLS). The one public field, the poster's
--     name on an event, comes from the security-definer function
--     event_poster_name(), which answers for events the caller can see.
--  2. profile_stats IS security_invoker, so it inherits RLS from
--     applications/profiles (a caller only aggregates rows they can see).
--  3. Event closing is split: a trigger blocks applications to non-open /
--     past-deadline events synchronously, max_applicants caps the SHORTLIST
--     only (total applications are uncapped), while deadline expiry is handled
--     by close_expired_events() on a pg_cron schedule — triggers cannot fire on
--     the passage of time.
--  4. Tier thresholds and point weights live in app_config so they stay
--     configurable without a migration.
--  5. events.category is TEXT (not an enum) and category-specific fields
--     (wedding style, spouse first names) live in events.details, so new
--     categories need no DDL:
--       details = { "style": "fine_art", "spouseFirstName1": "...", "spouseFirstName2": "..." }
--  6. Accounts are soft-deactivated, never hard-deleted. Event policies must
--     NOT select profiles under RLS: the profiles policy "Senders can view
--     applicants to their events" joins events, which would re-enter those
--     policies and recurse. is_active_profile() is security definer so it
--     reads profiles without triggering that cycle.
--  7. RLS picks the rows a client may update, column grants pick the columns
--     (see "grants" below), so a row you may update cannot be rewritten
--     wholesale.
--  8. Functions are not callable by clients unless granted next to their
--     definition. Supabase would let anon and authenticated call every
--     function in public, security definer ones included, so notify_user
--     would forge notifications and check_email_rate_limit would lock out
--     anyone's IP.

create extension if not exists pg_cron;
-- Trigram indexes make the feed's substring search fast, and unaccent lets
-- "forli" find "Forlì".
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() is only stable, because its dictionary could change, so a
-- generated column cannot call it. Naming the dictionary pins it, which makes
-- this wrapper safe to declare immutable.
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
create extension if not exists pg_net with schema extensions;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;

-- ---------------------------------------------------------------- helpers ---

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- --------------------------------------------------------------- profiles ---

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  website text,
  instagram_handle text,
  country text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  favorite_regions text[] not null default '{}',
  interested_categories text[] not null default '{}',
  locale text,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  deactivated_at timestamptz,
  is_email_opted_out boolean not null default false,
  onboarded_at timestamptz
);

comment on column public.profiles.interested_categories is
  'Event categories the feed shows by default. Empty means every category.';
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

-- Auto-create a profile row on signup, with the name the signup form sent.
-- The rest stays null until onboarding or the profile page fills it in.
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

-- Stamps the login and says whether it brought the account back. Coming back
-- is not an undo: deactivating deleted the applications the user had sent and
-- their open events, and the app tells them so on the sign-in that
-- reactivates, and only that one.
--
-- Reactivation is its own update, guarded on `not is_active`: the app calls
-- this more than once per sign-in (boot and the auth listener race), and the
-- row lock makes the second call re-check the guard and find nothing, so only
-- one of them reports true.
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

  return found;
end;
$$;

grant execute on function public.touch_login() to authenticated;

-- ----------------------------------------------------------------- events ---

create table public.events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'wedding',
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
  -- Pre-recorded event audio; transcription runs in an edge function.
  audio_url text,
  transcript text,
  transcript_status text not null default 'none'
    check (transcript_status in ('none', 'pending', 'done', 'error')),
  image_urls text[] not null default '{}',
  -- What the feed's search box matches, lowercased and without accents: the
  -- title, the couple a wedding card shows instead, the place, and a
  -- festival's headliner.
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
create index events_search_idx on public.events
  using gin (search_text extensions.gin_trgm_ops);
-- GIN covers containment queries, e.g. details @> '{"style":"editorial"}'.
create index events_details_gin_idx on public.events using gin (details);
-- B-tree expression index covers key extraction,
-- e.g. details->>'style' = 'editorial'.
create index events_details_style_idx on public.events ((details ->> 'style'));
create index events_details_genre_idx on public.events ((details ->> 'genre'));

-- ----------------------------------------------------------- applications ---

-- pending -> shortlisted (max max_applicants) -> selected (winner, via
-- assign_winner), or rejected.
create table public.applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  motivation text not null,
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'selected', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, applicant_id)
);

create index applications_event_id_idx on public.applications (event_id);
create index applications_applicant_id_idx on public.applications (applicant_id);
create index applications_event_status_idx on public.applications (event_id, status);

-- Filtered realtime evaluates UPDATE/DELETE filters only when the full row is
-- replicated; otherwise filtered channels stay silent.
alter table public.events replica identity full;
alter table public.applications replica identity full;

-- ------------------------------------------------------------- app_config ---

-- Points: 2 per application, 5 per shortlist, 10 per win. A win implies the
-- shortlist stage, so selections also count in the shortlist term
-- (2 + 5 + 10 = 17 per win). Below bronze there is no tier.
create table public.app_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('points_per_application', 2, 'Points per application.'),
  ('points_per_shortlist', 5, 'Points per shortlist (selections count too).'),
  ('points_per_selection', 10, 'Points per win (selected).'),
  ('tier_bronze_min_points', 75, 'Minimum points for bronze tier.'),
  ('tier_silver_min_points', 125, 'Minimum points for silver tier.'),
  ('tier_gold_min_points', 200, 'Minimum points for gold tier.');

-- ------------------------------------------------------- write-time rules ---

-- Block applications to your own events, to events that are not open or past
-- their deadline, and to events whose sender has deactivated.
-- NOTE: total applications are intentionally uncapped; max_applicants limits
-- the shortlist (enforced in enforce_selection_cap below).
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

-- Cap the shortlist: shortlisted per event cannot exceed max_applicants.
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

-- The applicant can update their own row, so status changes are guarded here.
-- They belong to the event owner, except give up (selected -> shortlisted).
-- selected is written only by assign_winner, which sets a transaction flag
-- the trigger can see.
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

  if auth.uid() = new.applicant_id
    and old.status = 'selected'
    and new.status = 'shortlisted' then
    return new;
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

-- The motivation is the applicant's own words: only they edit it, and only
-- until the event owner has decided.
create or replace function public.enforce_motivation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.motivation is not distinct from old.motivation then
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

-- Assign a winner atomically: the event becomes assigned, the winner (from the
-- shortlist) selected, the rest rejected. Only the owning sender can call it.
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
  where id = p_event_id;

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

  -- Lets the status trigger accept this selected write, and only this one.
  perform set_config('vaitu.assigning', 'on', true);

  update public.applications
  set status = 'selected', updated_at = now()
  where id = p_application_id;

  update public.applications
  set status = 'rejected', updated_at = now()
  where event_id = p_event_id
    and id <> p_application_id
    and status <> 'rejected';
end;
$$;

grant execute on function public.assign_winner(uuid, uuid) to authenticated;

-- Winner gives up: reopen the event automatically. Applicants cannot update
-- events (RLS), so the flip lives here: when no selected application remains
-- on an assigned event, it goes back to open and the sender picks another
-- winner from the shortlist.
create or replace function public.reopen_on_give_up()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
  v_event public.events%rowtype;
begin
  if old.status <> 'selected' or new.status = 'selected' then
    return new;
  end if;

  select * into v_event
  from public.events
  where id = new.event_id;

  if v_event.status <> 'assigned' then
    return new;
  end if;

  -- Past deadline: stays assigned, the sender reopens with a new one.
  if v_event.application_deadline <= now() then
    return new;
  end if;

  select count(*) into v_remaining
  from public.applications
  where event_id = new.event_id
    and status = 'selected';

  if v_remaining = 0 then
    update public.events
    set status = 'open', updated_at = now()
    where id = new.event_id;
  end if;

  return new;
end;
$$;

create trigger trg_reopen_on_give_up
  after update of status on public.applications
  for each row execute function public.reopen_on_give_up();

-- Closes events whose application_deadline has passed. Returns the number of
-- events closed.
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

-- ------------------------------------------------------------- updated_at ---

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------ views ---

-- The poster's name on an event, the only profile field anyone else sees.
-- Security definer to read past the own-row profiles policy, so it mirrors
-- the event select policies itself: the caller's own events, open events of
-- active posters, and closed or assigned events of anyone.
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
    and (e.status <> 'open' or p.is_active or e.sender_id = auth.uid());
$$;

grant execute on function public.event_poster_name(uuid) to anon, authenticated;

-- Points and tier for every account that applies. security_invoker = true so
-- the view inherits the caller's RLS on applications/profiles.
create view public.profile_stats
with (security_invoker = true) as
select
  scored.profile_id,
  scored.applications_count,
  scored.shortlists_count,
  scored.selections_count,
  scored.points,
  case
    when scored.points >= (select value from public.app_config where key = 'tier_gold_min_points')
      then 'gold'
    when scored.points >= (select value from public.app_config where key = 'tier_silver_min_points')
      then 'silver'
    when scored.points >= (select value from public.app_config where key = 'tier_bronze_min_points')
      then 'bronze'
    else null
  end as tier
from (
  select
    p.id as profile_id,
    count(a.id) as applications_count,
    count(a.id) filter (where a.status = 'shortlisted') as shortlists_count,
    count(a.id) filter (where a.status = 'selected') as selections_count,
    (
      count(a.id) * (select value from public.app_config where key = 'points_per_application')
      + (count(a.id) filter (where a.status in ('shortlisted', 'selected')))
        * (select value from public.app_config where key = 'points_per_shortlist')
      + (count(a.id) filter (where a.status = 'selected'))
        * (select value from public.app_config where key = 'points_per_selection')
    ) as points
  from public.profiles p
  left join public.applications a on a.applicant_id = p.id
  group by p.id
) scored;

-- -------------------------------------------------------------------- RLS ---

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.app_config enable row level security;

-- profiles: own row, plus the applicants to your events (name/site/instagram
-- needed to evaluate and forward to the couple). Only handle_new_user creates
-- rows.
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
        and e.sender_id = auth.uid()
    )
  );

-- app_config: readable by everyone, writable only via service_role/dashboard.
create policy "Anyone can read app config"
  on public.app_config for select to anon, authenticated
  using (true);

-- events: open events of active senders are public. Closed and assigned
-- events are history: readable for everyone, active sender or not, so winners
-- never lose the event their application refers to. Inactive accounts cannot
-- create or edit events (their token may still be valid).
create policy "Anyone can view open events"
  on public.events for select to anon, authenticated
  using (
    status = 'open'
    and public.is_active_profile(sender_id)
  );

create policy "Anyone can view closed events"
  on public.events for select to anon, authenticated
  using (status <> 'open');

create policy "Senders can view their own events"
  on public.events for select to authenticated
  using (sender_id = auth.uid());

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
    and public.is_active_profile(auth.uid())
  )
  with check (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

create policy "Senders can delete their own events"
  on public.events for delete to authenticated
  using (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

-- applications: applicants own their rows; senders see rows on their events.
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

create policy "Applicants can withdraw their own applications"
  on public.applications for delete to authenticated
  using (applicant_id = auth.uid());

-- ----------------------------------------------------------------- grants ---

-- Supabase grants anon and authenticated every privilege on public tables by
-- default and policies only pick rows, so without the column grants below the
-- owner of a row could rewrite any of its columns: a profile's activity
-- stamps, an application's event or applicant.
grant select on public.profile_stats to authenticated;
grant select on public.app_config to anon, authenticated;

grant select on public.events to anon, authenticated;

-- Every region the feed could show an event in, as stored: open events
-- other than your own, in the given categories (every category when empty).
-- The feed offers them as filters without loading the events, so they match
-- what it can return. The client folds spellings together.
create or replace function public.open_event_regions(
  categories text[] default '{}'
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
    and (cardinality(categories) = 0 or e.category = any (categories))
$$;

grant execute on function public.open_event_regions(text[])
  to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

revoke insert, update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name,
  website,
  instagram_handle,
  country,
  region,
  favorite_regions,
  interested_categories,
  locale,
  avatar_url,
  onboarded_at,
  is_email_opted_out
) on public.profiles to authenticated;

revoke update on public.applications from anon, authenticated;
grant select, insert, delete on public.applications to authenticated;
grant update (status, motivation) on public.applications to authenticated;

-- ---------------------------------------------------------- notifications ---

-- The in-app feed. The database already knows when something worth telling
-- about happens (an application arrives, a sender picks or rejects, an event
-- changes shape or closes); these triggers turn that knowledge into rows a
-- bell can read, and the push transport reads the very same rows.
--
-- RLS makes the feed private per user, and the writers are
-- security-definer helpers so no client ever writes directly.
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'application_received',
      'application_selected',
      'application_rejected',
      'event_updated',
      'event_closed'
    )
  ),
  event_id uuid references public.events (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
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

-- Marking read is the only change a client makes; pushed_at belongs to
-- push-notify, which runs as the service role.
revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- The single writer the triggers go through. Security definer so inserting
-- never fights the read policy above; a notification for a signed-out user is
-- made from no client at all. Silently skips: nobody (an absent actor), a
-- deactivated user (they left; their feed would pile up unread), and the
-- actor themselves (you never notify you of your own action).
create or replace function public.notify_user(
  p_user uuid,
  p_type text,
  p_event uuid default null,
  p_application uuid default null
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
  insert into public.notifications (user_id, type, event_id, application_id)
  values (p_user, p_type, p_event, p_application);
end;
$$;

-- Someone applied: the event's sender learns of it.
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

-- The sender picked or rejected: the applicant learns of it. Only real
-- transitions (pending -> decided) notify, never same-state updates.
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

-- The event changed shape (edits, or closed for good): the applicants with a
-- live application learn of it. Column-listed so a mere touch never notifies.
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
    old.title is distinct from new.title
    or old.location is distinct from new.location
    or old.country is distinct from new.country
    or old.region is distinct from new.region
    or old.event_date is distinct from new.event_date
    or old.application_deadline is distinct from new.application_deadline
    or old.details is distinct from new.details
    or old.status is distinct from new.status
  )
  execute function public.vaitu_on_event_changed();

-- ----------------------------------------------------- push_subscriptions ---

-- A browser endpoint belongs to one user at a time, whoever last signed in
-- there, so two people sharing a laptop never both get pushes on it.
create table public.push_subscriptions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Writes go through save_push_subscription: the endpoint may still be held by
-- the previous user of this browser (a sign-out that could not reach the
-- server), and RLS would hide that row from the one taking it over.
create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
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

  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth;
end;
$$;

grant execute on function public.save_push_subscription(text, text, text)
  to authenticated;

-- The wake that turns a notifications insert into a push, for recipients with
-- somewhere to push to only: most have none, and each wake is an HTTP call.
-- The trigger only wakes push-notify, it never sends. The URL and the
-- service-role key it calls with live in Vault (project_url,
-- service_role_key): supabase/seed.sql sets the local ones, docs/deploying.md
-- says how to set the cloud ones. pg_net sends once the insert commits, so
-- push-notify finds the row.
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
    select 1 from public.push_subscriptions where user_id = new.user_id
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

-- ------------------------------------------------------------ check-email ---

-- The unauthenticated check-email endpoint answers "is there an account for
-- this address?", so left unthrottled it is a user-enumeration oracle: anyone
-- can walk the whole address space at line rate and build a list of who has an
-- account. Count attempts per hashed client IP in a fixed window; the edge
-- function asks check_email_rate_limit() before it does anything else.
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

-- The answer itself, from auth.users, the only record of who has an account.
-- Callers pass the address lowercased, the way GoTrue stores it.
create function public.account_exists(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from auth.users where email = p_email);
$$;

-- Windows expire on their own; sweep them hourly so the table stays small.
select cron.schedule(
  'purge-check-email-rate-limits',
  '17 * * * *',
  $$delete from public.check_email_rate_limits
    where window_start < now() - interval '1 day'$$
);

-- ----------------------------------------------------------- app_versions ---

-- The oldest native build allowed to run. The iOS and Android apps ship their
-- web code inside the binary, so the service worker that keeps the web app
-- current never reaches them: at launch and on every resume they read their
-- platform's row here and, while their own build number (CFBundleVersion /
-- versionCode) is below `min_build`, show nothing but a screen sending the
-- user to the store. Raising `min_build` is how a release is made mandatory —
-- a row update, no deploy, since the binaries that must obey it are the old
-- ones already out there.
--
-- `store_url` lives here too so it can be fixed without a release. Null keeps
-- the screen up without a store button: on iOS until the App Store id exists.
create table public.app_versions (
  platform text primary key check (platform in ('ios', 'android')),
  min_build integer not null check (min_build >= 1),
  store_url text
);

alter table public.app_versions enable row level security;

-- Read before sign-in too: the sign-in screen is as much behind the gate as
-- the rest. No write policy: only the dashboard (service role) changes it.
create policy "Anyone reads the minimum app versions"
  on public.app_versions for select to anon, authenticated
  using (true);

insert into public.app_versions (platform, min_build, store_url) values
  ('ios', 1, null),
  ('android', 1, 'https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu');

-- ---------------------------------------------------------------- storage ---

-- Public buckets; every user writes only under their own uid folder. Image
-- limits live on the bucket, where every client sees them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('event-audio', 'event-audio', true, null, null),
  ('event-ics', 'event-ics', true, null, null),
  ('event-images', 'event-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp'])
-- Upsert: the cloud project's buckets predate this baseline and may survive
-- a reset of its database.
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- event-audio: pre-recorded event audio, managed by the sender.
create policy "Anyone can read event audio"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-audio');

create policy "Senders can upload event audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can update own event audio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can delete own event audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

-- event-ics: generated .ics calendar files; anyone can read one to import it.
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

-- event-images: one or more photos per event.
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

-- avatars: profile photos.
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

-- --------------------------------------------------------------- realtime ---

-- Clients refetch on change instead of polling: sender counts (applications),
-- the market list (events) and the notification bell (notifications).
alter publication supabase_realtime add table public.applications;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.notifications;
