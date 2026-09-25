-- Vaitu · close spec gaps (boss review)
--
-- 1. A sender can read the profiles of seekers who applied to their events
--    (name/site/instagram needed to evaluate and forward to the couple).
create policy "Senders can view applicants to their events"
  on public.profiles for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.events e on e.id = a.event_id
      where a.applicant_id = public.profiles.id
        and e.sender_id = auth.uid()
    )
  );

-- 2. Motivation is required (application form textarea).
alter table public.applications
  alter column motivation set not null;

-- 3. Constrain sub_role to known values (null = not set).
alter table public.profiles
  add constraint profiles_sub_role_check check (sub_role in ('assistant'));

-- 4. Only senders can create events (DB-enforced, previously app-only).
drop policy "Senders can create their own events" on public.events;

create policy "Senders can create their own events"
  on public.events for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'sender'
    )
  );
