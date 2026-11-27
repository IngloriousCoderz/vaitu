-- Applications, and how they move from pending to the winner.

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs (id) on delete cascade,
  -- Null once the applicant erased their account: [Deleted User] in the app.
  applicant_id uuid references public.profiles (id) on delete set null,
  motivation text not null,
  status text not null default 'pending'
    check (status in ('pending', 'shortlisted', 'selected', 'rejected', 'withdrawn')),
  status_before_assign text
    check (status_before_assign in ('pending', 'shortlisted')),
  -- Null on a withdrawn row means deactivation withdrew it, not the applicant.
  withdrawn_from text
    check (withdrawn_from in ('pending', 'shortlisted', 'selected', 'rejected')),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index applications_one_live_per_job
  on public.applications (job_id, applicant_id)
  where status <> 'withdrawn';
create index applications_job_id_idx on public.applications (job_id);
create index applications_applicant_id_idx on public.applications (applicant_id);
create index applications_job_status_idx on public.applications (job_id, status);

-- Filtered realtime evaluates UPDATE/DELETE filters only when the full row is
-- replicated; otherwise filtered channels stay silent.
alter table public.applications replica identity full;

create trigger trg_applications_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

create or replace function public.enforce_application_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
begin
  select * into v_job
  from public.jobs
  where id = new.job_id;

  if not found then
    raise exception 'Job does not exist.';
  end if;

  if v_job.poster_id = new.applicant_id then
    raise exception 'You cannot apply to your own job.';
  end if;

  if v_job.deleted_at is not null then
    raise exception 'Job does not exist.';
  end if;

  if public.are_blocked(v_job.poster_id, new.applicant_id) then
    raise exception 'You cannot apply to this job.';
  end if;

  if v_job.status <> 'open' then
    raise exception 'Job is not open for applications (status=%).', v_job.status;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = v_job.poster_id and is_active
  ) then
    raise exception 'The account behind this job has been deactivated.';
  end if;

  if now() > v_job.application_deadline then
    raise exception 'Application deadline has passed.';
  end if;

  return new;
end;
$$;

create trigger trg_applications_rules
  before insert on public.applications
  for each row execute function public.enforce_application_rules();

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

  -- A shortlist given back after the winner withdrew fitted when it was
  -- made: a cap lowered since must not stop the withdrawal.
  if current_setting('vaitu.restoring', true) = 'on' then
    return new;
  end if;

  select max_applicants into v_max
  from public.jobs
  where id = new.job_id;

  select count(*) into v_count
  from public.applications
  where job_id = new.job_id
    and status = 'shortlisted'
    and id <> new.id;

  if v_count >= v_max then
    raise exception 'Shortlist is full (max %).', v_max;
  end if;

  return new;
end;
$$;

create trigger trg_applications_selection_cap
  before insert or update of status on public.applications
  for each row execute function public.enforce_selection_cap();

-- Clients can update their own row, so status changes are guarded here.
-- assign_winner, withdraw_application and retire_profile_activity pass by
-- setting a transaction flag.
create or replace function public.enforce_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poster_id uuid;
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

  if current_setting('vaitu.restoring', true) = 'on'
    or current_setting('vaitu.withdrawing', true) = 'on' then
    return new;
  end if;

  if old.status = 'withdrawn' or new.status = 'withdrawn' then
    raise exception 'You cannot change this application status.';
  end if;

  -- A decision taken after the assignment is the poster's: a withdrawing
  -- winner must not undo it.
  if current_setting('vaitu.assigning', true) is distinct from 'on' then
    new.status_before_assign := null;
  end if;

  select poster_id into v_poster_id
  from public.jobs
  where id = new.job_id;

  if auth.uid() = v_poster_id
    and current_setting('vaitu.assigning', true) = 'on'
    and new.status in ('selected', 'rejected') then
    return new;
  end if;

  -- The winner's job is theirs: taking it back would also stop them from
  -- saying whether they were paid.
  if auth.uid() = v_poster_id
    and old.status <> 'selected'
    and new.status in ('pending', 'shortlisted', 'rejected') then
    return new;
  end if;

  raise exception 'You cannot change this application status.';
end;
$$;

create trigger trg_applications_status_change
  before insert or update of status on public.applications
  for each row execute function public.enforce_application_status_change();

create or replace function public.enforce_motivation_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.motivation is not distinct from old.motivation
    or current_setting('vaitu.withdrawing', true) = 'on' then
    return new;
  end if;

  if auth.uid() = new.applicant_id
    and old.status in ('pending', 'shortlisted') then
    return new;
  end if;

  raise exception 'You cannot change this motivation.';
end;
$$;

create trigger trg_applications_motivation_change
  before update of motivation on public.applications
  for each row execute function public.enforce_motivation_change();

create or replace function public.assign_winner(
  p_job_id uuid,
  p_application_id uuid,
  p_agreed_amount numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poster_id uuid;
  v_status text;
begin
  select poster_id into v_poster_id
  from public.jobs
  where id = p_job_id and deleted_at is null;

  if not found then
    raise exception 'Job does not exist.';
  end if;

  if v_poster_id <> auth.uid() then
    raise exception 'Only the poster can assign a winner.';
  end if;

  select status into v_status
  from public.applications
  where id = p_application_id and job_id = p_job_id;

  if not found then
    raise exception 'Application does not belong to this job.';
  end if;

  if v_status <> 'shortlisted' then
    raise exception 'Winner must come from the shortlist.';
  end if;

  update public.jobs
  set status = 'assigned', updated_at = now()
  where id = p_job_id;

  perform set_config('vaitu.assigning', 'on', true);

  update public.applications
  set status = 'selected', updated_at = now()
  where id = p_application_id;

  update public.applications
  set status = 'rejected',
      status_before_assign = status,
      updated_at = now()
  where job_id = p_job_id
    and id <> p_application_id
    and status not in ('rejected', 'withdrawn');

  if p_agreed_amount is not null then
    perform public.record_job_agreement(p_application_id, p_agreed_amount);
  end if;
end;
$$;

grant execute on function public.assign_winner(uuid, uuid, numeric) to authenticated;

-- Applicants cannot update jobs (RLS), so the reopen lives here. Only the
-- winner's own withdrawal reopens: deleting the job or deactivating an
-- account must not.
create or replace function public.withdraw_application(p_application_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_job public.jobs%rowtype;
begin
  select * into v_application
  from public.applications
  where id = p_application_id
  for update;

  if not found
    or v_application.applicant_id is distinct from auth.uid()
    or v_application.status = 'withdrawn' then
    raise exception 'Application does not exist.';
  end if;

  if exists (
    select 1 from public.job_reviews where application_id = p_application_id
  ) then
    raise exception 'This job has already been reviewed.';
  end if;

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications
  set status = 'withdrawn',
      withdrawn_from = v_application.status,
      withdrawn_at = now(),
      status_before_assign = null
  where id = p_application_id;
  perform set_config('vaitu.withdrawing', 'off', true);

  select * into v_job
  from public.jobs
  where id = v_application.job_id;

  perform public.notify_user(
    v_job.poster_id,
    'application_withdrawn',
    v_job.id,
    null,
    (select full_name from public.profiles where id = v_application.applicant_id)
  );

  if v_application.status <> 'selected' then
    return;
  end if;

  perform set_config('vaitu.restoring', 'on', true);
  update public.applications
  set status = status_before_assign,
      status_before_assign = null
  where job_id = v_job.id
    and status = 'rejected'
    and status_before_assign is not null;
  perform set_config('vaitu.restoring', 'off', true);

  if v_job.status <> 'assigned'
    or v_job.deleted_at is not null
    or v_job.application_deadline <= now()
    or exists (
      select 1 from public.applications
      where job_id = v_job.id and status = 'selected'
    ) then
    return;
  end if;

  update public.jobs
  set status = 'open'
  where id = v_job.id;
end;
$$;

grant execute on function public.withdraw_application(uuid) to authenticated;

alter table public.applications enable row level security;

create policy "Applicants can view their own applications"
  on public.applications for select to authenticated
  using (applicant_id = auth.uid());

create policy "Posters can view applications to their jobs"
  on public.applications for select to authenticated
  using (
    exists (
      select 1 from public.jobs e
      where e.id = applications.job_id
        and e.poster_id = auth.uid()
    )
  );

create policy "Applicants can apply to jobs"
  on public.applications for insert to authenticated
  with check (applicant_id = auth.uid());

create policy "Applicants can update their own applications"
  on public.applications for update to authenticated
  using (applicant_id = auth.uid())
  with check (applicant_id = auth.uid());

create policy "Posters can update applications to their jobs"
  on public.applications for update to authenticated
  using (
    exists (
      select 1 from public.jobs e
      where e.id = applications.job_id
        and e.poster_id = auth.uid()
    )
  );

-- What a poster needs to recognise and contact an applicant, and nothing
-- else of their profile: a policy would hand over the whole row.
create function public.applicant_profiles(p_application_ids uuid[])
returns table (
  application_id uuid,
  full_name text,
  website text,
  phone text,
  country text,
  avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, p.full_name, p.website, p.phone, p.country, p.avatar_url
  from public.applications a
  join public.jobs e on e.id = a.job_id
  join public.profiles p on p.id = a.applicant_id
  where a.id = any (p_application_ids)
    and a.status <> 'withdrawn'
    and e.poster_id = auth.uid()
    and e.deleted_at is null;
$$;

grant execute on function public.applicant_profiles(uuid[]) to authenticated;

revoke insert, update, delete on public.applications from anon, authenticated;
grant select on public.applications to authenticated;
grant insert (job_id, applicant_id, motivation)
  on public.applications to authenticated;
grant update (status, motivation) on public.applications to authenticated;

alter publication supabase_realtime add table public.applications;
