-- Vaitu · fix events ↔ profiles RLS recursion from deactivate_account.
--
-- Local DBs that already applied 20261021000000 with a direct profiles
-- subquery in event policies hit "infinite recursion detected in policy for
-- relation events" for every logged-in select. This migration installs the
-- security-definer helper and rewrites the policies (idempotent).

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
