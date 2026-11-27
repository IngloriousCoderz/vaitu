-- Jobs, what anyone may read of them, and how their status moves.

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  -- Null once the poster erased their account: the row is anonymous history.
  poster_id uuid references public.profiles (id) on delete set null,
  setting text not null default 'wedding'
    check (setting in ('wedding', 'festival', 'concert', 'apartment', 'house', 'office')),
  profession text not null,
  job_type text generated always as (setting || '_' || profession) stored,
  -- A substitute takes the job over, client included: the client pays them,
  -- and they may owe the poster a fee. An assistant works alongside the
  -- poster, who keeps the client and pays them.
  seeking text not null default 'substitute'
    check (seeking in ('substitute', 'assistant')),
  title text not null,
  location text not null,
  country text not null,
  region text not null,
  job_date date not null,
  application_deadline timestamptz not null,
  max_applicants integer not null default 5 check (max_applicants > 0),
  status text not null default 'open' check (status in ('open', 'closed', 'assigned')),
  details jsonb not null default '{}'::jsonb,
  description text check (char_length(description) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  image_urls text[] not null default '{}',
  deleted_at timestamptz,
  outcome_requested_at timestamptz,
  search_text text generated always as (
    public.immutable_unaccent(lower(
      title || ' ' || location || ' ' || region || ' ' ||
      coalesce(details ->> 'spouse_first_name_1', '') || ' ' ||
      coalesce(details ->> 'spouse_first_name_2', '') || ' ' ||
      coalesce(details ->> 'headliner', '')
    ))
  ) stored
);

create index jobs_poster_id_idx on public.jobs (poster_id);
create index jobs_browse_idx on public.jobs (status, region, job_date);
create index jobs_setting_idx on public.jobs (setting);
create index jobs_job_type_idx on public.jobs (job_type);
create index jobs_search_idx on public.jobs
  using gin (search_text extensions.gin_trgm_ops);
create index jobs_details_gin_idx on public.jobs using gin (details);

-- Filtered realtime evaluates UPDATE/DELETE filters only when the full row is
-- replicated; otherwise filtered channels stay silent.
alter table public.jobs replica identity full;

create trigger trg_jobs_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

alter table public.jobs enable row level security;

create policy "Anyone can view open jobs"
  on public.jobs for select to anon, authenticated
  using (
    status = 'open'
    and deleted_at is null
    and public.is_active_profile(poster_id)
    and not public.are_blocked(auth.uid(), poster_id)
  );

create policy "Anyone can view closed jobs"
  on public.jobs for select to anon, authenticated
  using (status <> 'open' and deleted_at is null);

create policy "Posters can view their own jobs"
  on public.jobs for select to authenticated
  using (poster_id = auth.uid() and deleted_at is null);

-- Status moves only through the functions: a job posted or marked
-- assigned by hand would count as a handoff without anyone doing the job.
create policy "Users can create their own jobs"
  on public.jobs for insert to authenticated
  with check (
    poster_id = auth.uid()
    and status = 'open'
    and deleted_at is null
    and outcome_requested_at is null
    and public.is_active_profile(auth.uid())
  );

create policy "Posters can update their own jobs"
  on public.jobs for update to authenticated
  using (
    poster_id = auth.uid()
    and deleted_at is null
    and public.is_active_profile(auth.uid())
  )
  with check (
    poster_id = auth.uid()
    and public.is_active_profile(auth.uid())
  );

grant select on public.jobs to anon, authenticated;

create or replace function public.open_job_regions(
  job_types text[] default '{}'
)
returns setof text
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct e.region
  from public.jobs e
  where e.status = 'open'
    and (auth.uid() is null or e.poster_id <> auth.uid())
    and (cardinality(job_types) = 0 or e.job_type = any (job_types))
$$;

grant execute on function public.open_job_regions(text[])
  to anon, authenticated;
revoke delete, update on public.jobs from anon, authenticated;
grant insert on public.jobs to authenticated;
grant update (
  setting,
  profession,
  seeking,
  title,
  location,
  country,
  region,
  job_date,
  application_deadline,
  max_applicants,
  details,
  description,
  updated_at,
  image_urls
) on public.jobs to authenticated;

create function public.job_poster_name(p_job_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.full_name
  from public.jobs e
  join public.profiles p on p.id = e.poster_id
  where e.id = p_job_id
    and e.deleted_at is null
    and (e.status <> 'open' or p.is_active or e.poster_id = auth.uid());
$$;

grant execute on function public.job_poster_name(uuid) to anon, authenticated;

-- Posters can't write a job's status: only this moves a closed or assigned
-- job back to open, with a new deadline when the old one has passed.
create or replace function public.reopen_job(
  p_job_id uuid,
  p_application_deadline timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.jobs%rowtype;
begin
  select * into v_job
  from public.jobs
  where id = p_job_id and deleted_at is null
  for update;

  if not found or v_job.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can reopen this job.';
  end if;

  if not public.is_active_profile(auth.uid()) then
    raise exception 'Only an active account can reopen a job.';
  end if;

  if v_job.status not in ('closed', 'assigned') then
    raise exception 'This job is already open.';
  end if;

  if coalesce(p_application_deadline, v_job.application_deadline) <= now() then
    raise exception 'The deadline must be in the future.';
  end if;

  update public.jobs
  set status = 'open',
      application_deadline =
        coalesce(p_application_deadline, v_job.application_deadline),
      updated_at = now()
  where id = p_job_id;
end;
$$;

grant execute on function public.reopen_job(uuid, timestamptz) to authenticated;

create or replace function public.close_expired_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_closed integer;
begin
  update public.jobs
  set status = 'closed', updated_at = now()
  where status = 'open'
    and deleted_at is null
    and application_deadline < now();

  get diagnostics v_closed = row_count;
  return v_closed;
end;
$$;

-- Time alone never touches a row, so realtime can only fire after this flips
-- expired statuses.
select cron.schedule(
  'close-expired-jobs',
  '* * * * *',
  $$select public.close_expired_jobs()$$
);

alter publication supabase_realtime add table public.jobs;
