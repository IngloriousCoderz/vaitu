-- Vaitu · one account posts events and applies to the events of others.
-- The seeker/sender role goes away. What decides access is ownership:
-- events.sender_id for the event, applications.applicant_id for the application.

-- Anyone signed in can post an event of their own.
drop policy "Senders can create their own events" on public.events;

create policy "Users can create their own events"
  on public.events for insert to authenticated
  with check (sender_id = auth.uid());

-- The public poster fields stay limited to people who posted something, so a
-- profile that only applies is not exposed.
create or replace view public.sender_profiles_public as
select
  id,
  full_name,
  sub_role,
  website,
  instagram_handle,
  country,
  region
from public.profiles p
where exists (select 1 from public.events e where e.sender_id = p.id);

-- Points and tier for every account that applies.
drop view if exists public.seeker_stats;

create view public.seeker_stats
with (security_invoker = true) as
select
  scored.applicant_id,
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
    p.id as applicant_id,
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

grant select on public.seeker_stats to anon, authenticated;

-- Signup no longer writes a role.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, country, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The same account cannot apply to an event it posted.
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

  if v_event.application_deadline is not null and now() > v_event.application_deadline then
    raise exception 'Application deadline has passed.';
  end if;

  return new;
end;
$$;

alter table public.profiles drop column role;
