-- The applicant can update their own row, so a direct status update
-- was accepted. Status changes belong to the event owner, except give up
-- (selected -> shortlisted). selected is written only by assign_winner,
-- which sets a transaction flag the trigger can see.

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

drop trigger if exists trg_applications_status_change on public.applications;

create trigger trg_applications_status_change
  before insert or update of status on public.applications
  for each row execute function public.enforce_application_status_change();

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
