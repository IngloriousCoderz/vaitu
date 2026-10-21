-- Vaitu · deactivation wipes the live marketplace presence, keeps the past.
--
-- A deactivated organizer cannot select anyone, so their open events (and the
-- received applications that cascade from them) leave the marketplace with
-- them — the application rules additionally refuse anybody trying to apply to
-- an event whose sender is not active. Past events with selected applicants
-- are part of other users' history and points, so they stay, and they stay
-- readable regardless of the sender's activity: a winner's application screen
-- joins the event, and a filtered join would come back as null.

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

  if v_event.application_deadline is not null and now() > v_event.application_deadline then
    raise exception 'Application deadline has passed.';
  end if;

  return new;
end;
$$;

-- Closed and assigned events are history: readable for everyone, active
-- sender or not, so winners never lose the event their application refers to.
drop policy if exists "Anyone can view closed events" on public.events;
create policy "Anyone can view closed events"
  on public.events for select to anon, authenticated
  using (status <> 'open');
