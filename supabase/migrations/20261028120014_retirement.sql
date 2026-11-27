-- Deleting jobs, deactivating accounts and erasing them.

-- Deleting removes what the job says, not that it happened. With nobody
-- involved there is no history to keep, so the row goes. Whoever is still
-- counting on an upcoming job hears it is off.
create or replace function public.retire_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  if not exists (
    select 1 from public.applications where job_id = p_job_id
  ) then
    delete from public.jobs where id = p_job_id;
    return;
  end if;

  delete from public.notifications where job_id = p_job_id;
  delete from public.job_pay where job_id = p_job_id;

  select title into v_title from public.jobs where id = p_job_id;

  perform public.notify_user(
    a.applicant_id,
    'job_cancelled',
    null,
    null,
    null,
    v_title
  )
  from public.applications a
  join public.jobs e on e.id = a.job_id
  where a.job_id = p_job_id
    and a.status in ('pending', 'shortlisted', 'selected')
    and e.job_date >= current_date;

  update public.jobs
  set deleted_at = now(),
      title = '',
      location = '',
      details = '{}'::jsonb,
      description = null,
      image_urls = '{}'
  where id = p_job_id;
end;
$$;

create or replace function public.delete_job(p_job_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.jobs
    where id = p_job_id
      and poster_id = auth.uid()
      and deleted_at is null
      and public.is_active_profile(auth.uid())
  ) then
    raise exception 'Only the poster can delete this job.';
  end if;

  perform public.retire_job(p_job_id);
end;
$$;

grant execute on function public.delete_job(uuid) to authenticated;

-- Deactivating takes a user out of what is still undecided or ahead. Only a
-- winner abandoning a job counts against them: the other withdrawals were not
-- their choice to make one by one, so they keep withdrawn_from null. Called by
-- the deactivate-account edge function.
create or replace function public.retire_profile_activity(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_abandoned record;
begin
  perform set_config('vaitu.withdrawing', 'on', true);

  for v_abandoned in
    update public.applications a
    set status = 'withdrawn',
        withdrawn_from = 'selected',
        withdrawn_at = now(),
        status_before_assign = null
    from public.jobs e
    where e.id = a.job_id
      and a.applicant_id = p_user_id
      and a.status = 'selected'
      and e.deleted_at is null
      and e.job_date >= current_date
      and not exists (
        select 1 from public.job_reviews r where r.application_id = a.id
      )
    returning e.id as job_id, e.poster_id
  loop
    perform public.notify_user(
      v_abandoned.poster_id,
      'application_withdrawn',
      v_abandoned.job_id,
      null,
      (select full_name from public.profiles where id = p_user_id)
    );
  end loop;

  update public.applications
  set status = 'withdrawn',
      withdrawn_at = now(),
      status_before_assign = null
  where applicant_id = p_user_id
    and status in ('pending', 'shortlisted');

  perform set_config('vaitu.withdrawing', 'off', true);

  perform public.retire_job(id)
  from public.jobs
  where poster_id = p_user_id
    and status = 'open'
    and deleted_at is null;
end;
$$;

-- Single-use links from the deactivation email. Only the hash is kept, so the
-- table cannot be used to erase anyone.
create table public.account_erasures (
  token_hash text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '30 days'
);

alter table public.account_erasures enable row level security;

revoke all on table public.account_erasures from anon, authenticated;

-- Runs however the account goes, so the app, the dashboard and any later tool
-- all leave the same anonymous history behind.
create or replace function public.erase_profile_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.retire_profile_activity(old.id);

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications
  set motivation = ''
  where applicant_id = old.id;
  perform set_config('vaitu.withdrawing', 'off', true);

  perform public.retire_job(id)
  from public.jobs
  where poster_id = old.id
    and deleted_at is null;

  update public.notifications
  set applicant_name = null
  where applicant_name = old.full_name;

  return old;
end;
$$;

create trigger trg_profile_erased
  before delete on public.profiles
  for each row execute function public.erase_profile_activity();
