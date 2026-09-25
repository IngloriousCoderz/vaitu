-- Vaitu · initial schema
-- Covers: profiles, events, applications, app_config, public views, RLS, triggers.
--
-- Design notes (fixes for the known issues):
--  1. profiles stays private (own-row RLS). Public Sender fields are exposed via
--     the SECURITY DEFINER view sender_profiles_public (safe columns only).
--     NOTE: this view must NOT be security_invoker, or anonymous callers would
--     see zero rows (invoker has no rights on the underlying table).
--  2. seeker_stats IS security_invoker, so it inherits RLS from
--     applications/profiles (a caller only aggregates rows they can see).
--  3. Event closing is split: a trigger blocks writes to non-open / past-deadline
--     events synchronously, max_applicants caps the SHORTLIST only (total
--     applications are uncapped — revisit later), while deadline expiry is
--     handled by close_expired_events() run on a schedule (pg_cron or a
--     scheduled edge function) — triggers cannot fire on the passage of time.
--  4. Tier thresholds live in app_config (tier_silver_min_selections,
--     tier_gold_min_selections) so they stay configurable without a migration.
--  5. events.category is TEXT (not an enum) so future categories need no migration.

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
  role text not null check (role in ('sender', 'seeker')),
  sub_role text,
  full_name text,
  website text,
  instagram_handle text,
  country text,
  region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-create a profile row on signup. Role defaults to 'seeker';
-- the app updates it once the user picks sender/seeker during onboarding.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    'seeker',
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------- events ---

create table public.events (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  category text not null default 'wedding',
  title text not null,
  location text,
  country text,
  region text,
  event_date date,
  style text,
  application_deadline timestamptz,
  max_applicants integer not null default 5 check (max_applicants > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'assigned')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_sender_id_idx on public.events (sender_id);
create index events_browse_idx on public.events (status, region, event_date);
create index events_category_idx on public.events (category);

-- ----------------------------------------------------------- applications ---

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  applicant_id uuid not null references public.profiles (id) on delete cascade,
  motivation text,
  status text not null default 'pending' check (status in ('pending', 'selected', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, applicant_id)
);

create index applications_event_id_idx on public.applications (event_id);
create index applications_applicant_id_idx on public.applications (applicant_id);
create index applications_event_status_idx on public.applications (event_id, status);

-- ------------------------------------------------------------- app_config ---

create table public.app_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('tier_silver_min_selections', 5, 'Placeholder — minimum selections for silver tier.'),
  ('tier_gold_min_selections', 20, 'Placeholder — minimum selections for gold tier.');

-- ------------------------------------------------------- write-time rules ---

-- Block applications to events that are not open or past their deadline.
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

  if v_event.status <> 'open' then
    raise exception 'Event is not open for applications (status=%).', v_event.status;
  end if;

  if v_event.application_deadline is not null and now() > v_event.application_deadline then
    raise exception 'Application deadline has passed.';
  end if;

  return new;
end;
$$;

create trigger trg_applications_rules
  before insert on public.applications
  for each row execute function public.enforce_application_rules();

-- Cap the shortlist: selections per event cannot exceed max_applicants.
-- max_applicants is the shortlist cap; total applications are uncapped.
create or replace function public.enforce_selection_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_max integer;
  v_selected integer;
begin
  if new.status <> 'selected' then
    return new;
  end if;

  select max_applicants into v_max
  from public.events
  where id = new.event_id;

  select count(*) into v_selected
  from public.applications
  where event_id = new.event_id
    and status = 'selected'
    and id <> new.id;

  if v_selected >= v_max then
    raise exception 'Shortlist is full (max %).', v_max;
  end if;

  return new;
end;
$$;

create trigger trg_applications_selection_cap
  before insert or update of status on public.applications
  for each row execute function public.enforce_selection_cap();

-- Called on a schedule (pg_cron or scheduled edge function) to close events
-- whose application_deadline has passed. Returns the number of events closed.
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
    and application_deadline is not null
    and application_deadline < now();

  get diagnostics v_closed = row_count;
  return v_closed;
end;
$$;

-- Example pg_cron schedule (run manually on the cloud project, not here):
--   select cron.schedule('close-expired-events', '*/15 * * * *', $$select public.close_expired_events()$$);

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

-- Public, safe Sender fields for event listings.
-- SECURITY DEFINER (default) is intentional: it runs as the view owner so
-- anonymous callers can read these columns without getting access to profiles.
create or replace view public.sender_profiles_public as
select
  id,
  full_name,
  sub_role,
  website,
  instagram_handle,
  country,
  region
from public.profiles
where role = 'sender';

-- Per-seeker aggregates. security_invoker = true so the view inherits the
-- caller's RLS on applications/profiles (a caller only aggregates rows
-- they are allowed to see — e.g. a seeker sees their own full stats).
create or replace view public.seeker_stats
with (security_invoker = true) as
select
  p.id as applicant_id,
  count(a.id) as applications_count,
  count(a.id) filter (where a.status = 'selected') as selections_count,
  case
    when count(a.id) filter (where a.status = 'selected') >= (select value from public.app_config where key = 'tier_gold_min_selections')
      then 'gold'
    when count(a.id) filter (where a.status = 'selected') >= (select value from public.app_config where key = 'tier_silver_min_selections')
      then 'silver'
    else 'bronze'
  end as tier
from public.profiles p
left join public.applications a on a.applicant_id = p.id
where p.role = 'seeker'
group by p.id;

-- -------------------------------------------------------------------- RLS ---

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.applications enable row level security;
alter table public.app_config enable row level security;

-- profiles: strictly own-row.
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated
  with check (auth.uid() = id);

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- app_config: readable by everyone, writable only via service_role/dashboard.
create policy "Anyone can read app config"
  on public.app_config for select to anon, authenticated
  using (true);

-- events: open events are publicly readable; senders manage their own.
create policy "Anyone can view open events"
  on public.events for select to anon, authenticated
  using (status = 'open');

create policy "Senders can view their own events"
  on public.events for select to authenticated
  using (sender_id = auth.uid());

create policy "Senders can create their own events"
  on public.events for insert to authenticated
  with check (sender_id = auth.uid());

create policy "Senders can update their own events"
  on public.events for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy "Senders can delete their own events"
  on public.events for delete to authenticated
  using (sender_id = auth.uid());

-- applications: seekers own their rows; senders see rows on their events.
create policy "Seekers can view their own applications"
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

create policy "Seekers can apply to events"
  on public.applications for insert to authenticated
  with check (applicant_id = auth.uid());

create policy "Seekers can update their own applications"
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

create policy "Seekers can withdraw their own applications"
  on public.applications for delete to authenticated
  using (applicant_id = auth.uid());

-- ----------------------------------------------------------------- grants ---

grant select on public.sender_profiles_public to anon, authenticated;
grant select on public.seeker_stats to anon, authenticated;
grant select on public.app_config to anon, authenticated;

grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.applications to authenticated;
