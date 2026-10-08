-- Vaitu · winner gives up: reopen the event automatically.
-- Seekers cannot update events (RLS), so the flip lives here: when no
-- selected application remains on an assigned event, it goes back to open
-- and the sender picks another winner from the shortlist.
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
  if v_event.application_deadline is not null
    and v_event.application_deadline <= now()
  then
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

drop trigger if exists trg_reopen_on_give_up on public.applications;

create trigger trg_reopen_on_give_up
  after update of status on public.applications
  for each row execute function public.reopen_on_give_up();
