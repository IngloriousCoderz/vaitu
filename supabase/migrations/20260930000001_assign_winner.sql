-- Vaitu · assign a winner to an event, atomically.
-- Sets the event to assigned, keeps the winner selected, rejects the rest.
-- Only the owning sender can call it; the winner must come from the shortlist.

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

  if v_status <> 'selected' then
    raise exception 'Winner must come from the shortlist (selected).';
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
