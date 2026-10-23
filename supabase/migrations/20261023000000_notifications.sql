-- Notifications, layer 1: the in-app feed. The database already knows when
-- something worth telling about happens (an application arrives, a sender
-- picks or rejects, an event changes shape or closes); these triggers turn
-- that knowledge into rows a bell can read, and Web/FCM/APNs transports
-- (a later card) can read the very same rows.
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
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read, created_at desc);
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

-- A seeker applied: the event's sender learns of it.
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

drop trigger if exists trg_application_received on public.applications;
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

drop trigger if exists trg_application_decided on public.applications;
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

drop trigger if exists trg_event_changed on public.events;
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
