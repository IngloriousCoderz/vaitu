-- The in-app feed: one row per thing a user should hear about, written only
-- by triggers and functions.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'application_received',
      'application_selected',
      'application_rejected',
      'application_withdrawn',
      'job_updated',
      'job_closed',
      'new_job',
      'job_outcome_due',
      'job_reviewed',
      'job_cancelled',
      'agreement_proposed',
      'agreement_confirmed',
      'agreement_rejected',
      'settlement_due',
      'settlement_contested'
    )
  ),
  job_id uuid references public.jobs (id) on delete cascade,
  application_id uuid references public.applications (id) on delete cascade,
  applicant_name text,
  -- Only when the job is gone, so its title cannot come from the job.
  job_title text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  -- Exactly-once claim for push-notify: null -> now() under READ COMMITTED.
  pushed_at timestamptz
);

create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);
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

revoke update on public.notifications from anon, authenticated;
grant update (is_read) on public.notifications to authenticated;

-- The name of who posted each job, for the jobs the caller was notified about:
-- profiles are private, and a notification already says who it is about.
create function public.notification_poster_names(p_job_ids uuid[])
returns table (job_id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select e.id, p.full_name
  from public.jobs e
  join public.profiles p on p.id = e.poster_id
  where e.id = any (p_job_ids)
    and exists (
      select 1 from public.notifications n
      where n.job_id = e.id and n.user_id = auth.uid()
    );
$$;

grant execute on function public.notification_poster_names(uuid[]) to authenticated;

-- Security definer, so no client writes notifications. Skips absent,
-- deactivated and self-notified users.
create or replace function public.notify_user(
  p_user uuid,
  p_type text,
  p_job uuid default null,
  p_application uuid default null,
  p_applicant_name text default null,
  p_job_title text default null
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
  insert into public.notifications
    (user_id, type, job_id, application_id, applicant_name, job_title)
  values (p_user, p_type, p_job, p_application, p_applicant_name, p_job_title);
end;
$$;

create or replace function public.vaitu_on_application_received()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.notify_user(
    (
      select poster_id from public.jobs where id = new.job_id
    ),
    'application_received',
    new.job_id,
    new.id
  );
  return new;
end;
$$;

create trigger trg_application_received
  after insert on public.applications
  for each row execute function public.vaitu_on_application_received();

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
    new.job_id,
    new.id
  );
  return new;
end;
$$;

create trigger trg_application_decided
  after update of status on public.applications
  for each row
  when (old.status is distinct from new.status
        and new.status in ('selected', 'rejected'))
  execute function public.vaitu_on_application_decided();

create or replace function public.vaitu_on_job_changed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_type text := case new.status
    when 'closed' then 'job_closed'
    else 'job_updated'
  end;
begin
  perform public.notify_user(
    a.applicant_id,
    v_type,
    new.id
  )
  from public.applications a
  where a.job_id = new.id
    and a.status in ('pending', 'selected')
    and a.applicant_id <> new.poster_id;
  return new;
end;
$$;

create trigger trg_job_changed
  after update of title, location, country, region, job_date,
                   application_deadline, details, description, status
  on public.jobs
  for each row
  when (
    new.deleted_at is null
    and (
    old.title is distinct from new.title
    or old.location is distinct from new.location
    or old.country is distinct from new.country
    or old.region is distinct from new.region
    or old.job_date is distinct from new.job_date
    or old.application_deadline is distinct from new.application_deadline
    or old.details is distinct from new.details
    or old.description is distinct from new.description
    or old.status is distinct from new.status
    )
  )
  execute function public.vaitu_on_job_changed();

-- Only someone who named their trades hears about new jobs: an empty list
-- means "show me everything" in the feed, which is not a wish for a push per
-- job. Regions are compared as written: normalizeJob stores the canonical
-- name, the one favorites use.
create or replace function public.vaitu_on_job_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'open' or new.application_deadline <= now() then
    return new;
  end if;

  perform public.notify_user(p.id, 'new_job', new.id)
  from public.profiles p
  where p.id <> new.poster_id
    and p.is_active
    and p.has_new_job_alerts
    and not public.are_blocked(p.id, new.poster_id)
    and new.profession = any (p.professions)
    and (
      cardinality(p.interested_settings) = 0
      or new.setting = any (p.interested_settings)
    )
    and (
      cardinality(p.favorite_regions) = 0
      or new.region = any (p.favorite_regions)
    );
  return new;
end;
$$;

create trigger trg_job_created
  after insert on public.jobs
  for each row execute function public.vaitu_on_job_created();

alter publication supabase_realtime add table public.notifications;
