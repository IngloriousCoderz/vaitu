-- Vaitu · soft-deactivate accounts instead of hard-deleting them.
--
-- Keeps the auth user, profile, events and applications so we can email
-- inactive people to come back (until they opt out of marketing mail).
-- Public event lists only show rows whose sender is still active.
--
-- Event policies must NOT select profiles under RLS: the profiles policy
-- "Senders can view applicants to their events" joins events, which would
-- re-enter these policies and recurse. is_active_profile() is security
-- definer so it reads profiles without triggering that cycle.

alter table public.profiles
  add column if not exists is_active boolean not null default true;

alter table public.profiles
  add column if not exists last_login_at timestamptz;

alter table public.profiles
  add column if not exists deactivated_at timestamptz;

alter table public.profiles
  add column if not exists email_opt_out boolean not null default false;

comment on column public.profiles.is_active is
  'False after the user deactivates; true again on the next successful login.';
comment on column public.profiles.last_login_at is
  'Updated on each successful session (including reactivation).';
comment on column public.profiles.deactivated_at is
  'When the user last chose Deactivate account; cleared on reactivation.';
comment on column public.profiles.email_opt_out is
  'When true, do not send re-engagement (or other marketing) email.';

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

revoke all on function public.is_active_profile(uuid) from public;
grant execute on function public.is_active_profile(uuid) to anon, authenticated;

-- Stamp login and clear a prior deactivation. Called from the client after
-- auth succeeds; security definer so RLS cannot block the self-update.
create or replace function public.touch_login()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  update public.profiles
  set
    last_login_at = now(),
    is_active = true,
    deactivated_at = null,
    updated_at = now()
  where id = auth.uid();
end;
$$;

revoke all on function public.touch_login() from public;
grant execute on function public.touch_login() to authenticated;

-- Explore / detail for everyone else: only active senders.
drop policy if exists "Anyone can view open events" on public.events;
create policy "Anyone can view open events"
  on public.events for select to anon, authenticated
  using (
    status = 'open'
    and public.is_active_profile(sender_id)
  );

drop policy if exists "Anyone can view closed events" on public.events;
create policy "Anyone can view closed events"
  on public.events for select to anon, authenticated
  using (
    status <> 'open'
    and public.is_active_profile(sender_id)
  );

-- Inactive accounts cannot create or edit events (token may still be valid).
drop policy if exists "Users can create their own events" on public.events;
drop policy if exists "Senders can create their own events" on public.events;
create policy "Users can create their own events"
  on public.events for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

drop policy if exists "Senders can update their own events" on public.events;
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

drop policy if exists "Senders can delete their own events" on public.events;
create policy "Senders can delete their own events"
  on public.events for delete to authenticated
  using (
    sender_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

-- Public poster cards should not surface deactivated accounts.
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
where p.is_active
  and exists (select 1 from public.events e where e.sender_id = p.id);
