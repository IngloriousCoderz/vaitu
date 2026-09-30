-- Vaitu · split shortlist from winner.
-- pending -> shortlisted (max max_applicants) -> selected (winner, via assign_winner).
-- Data migration: selected on assigned events were winners; on open events,
-- shortlist members.

alter table public.applications drop constraint applications_status_check;

update public.applications a
set status = 'shortlisted'
from public.events e
where a.event_id = e.id
  and a.status = 'selected'
  and e.status <> 'assigned';

alter table public.applications
  add constraint applications_status_check
  check (status in ('pending', 'shortlisted', 'selected', 'rejected'));

-- Shortlist cap now counts shortlisted (not selected).
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

-- Winner must come from the shortlist.
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

  update public.applications
  set status = 'rejected', updated_at = now()
  where event_id = p_event_id
    and id <> p_application_id
    and status <> 'rejected';
end;
$$;
