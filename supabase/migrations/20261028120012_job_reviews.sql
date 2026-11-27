-- What the poster reports once the job date has come: whether the winner
-- did the job, and how well. One review per job, written once, and only by the
-- poster: nothing in here is the winner's to change.
create table public.job_reviews (
  application_id uuid primary key references public.applications (id) on delete cascade,
  outcome text not null check (outcome in ('completed', 'no_show', 'cancelled')),
  rating smallint check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  -- Set by moderation: the comment stops showing, the rating still counts.
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check ((outcome = 'completed') = (rating is not null)),
  check (outcome = 'completed' or comment is null)
);

alter table public.job_reviews enable row level security;

create policy "Both sides of a job can read its review"
  on public.job_reviews for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs e on e.id = a.job_id
      where a.id = job_reviews.application_id
        and (a.applicant_id = auth.uid() or e.poster_id = auth.uid())
    )
  );

revoke all on public.job_reviews from anon, authenticated;
grant select on public.job_reviews to authenticated;

create or replace function public.submit_job_review(
  p_application_id uuid,
  p_outcome text,
  p_rating integer default null,
  p_comment text default null
)
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
  where id = p_application_id;

  if not found then
    raise exception 'Application does not exist.';
  end if;

  select * into v_job
  from public.jobs
  where id = v_application.job_id and deleted_at is null;

  if not found or v_job.poster_id is distinct from auth.uid() then
    raise exception 'Only the poster can review this job.';
  end if;

  if v_application.status <> 'selected' then
    raise exception 'Only the winner can be reviewed.';
  end if;

  if v_job.job_date > current_date then
    raise exception 'A job can be reviewed once its date has come.';
  end if;

  insert into public.job_reviews (application_id, outcome, rating, comment)
  values (p_application_id, p_outcome, p_rating, nullif(trim(p_comment), ''));

  if p_outcome <> 'cancelled' then
    perform public.notify_user(
      v_application.applicant_id,
      'job_reviewed',
      v_job.id,
      p_application_id
    );
  end if;
end;
$$;

grant execute on function public.submit_job_review(uuid, text, integer, text)
  to authenticated;

create or replace function public.request_job_outcomes()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_due record;
  v_requested integer := 0;
begin
  for v_due in
    update public.jobs e
    set outcome_requested_at = now()
    where e.status = 'assigned'
      and e.deleted_at is null
      and e.outcome_requested_at is null
      and e.job_date < current_date
      and exists (
        select 1
        from public.applications a
        where a.job_id = e.id
          and a.status = 'selected'
          and not exists (
            select 1 from public.job_reviews r where r.application_id = a.id
          )
      )
    returning e.id, e.poster_id
  loop
    perform public.notify_user(v_due.poster_id, 'job_outcome_due', v_due.id);
    perform public.notify_user(a.applicant_id, 'settlement_due', v_due.id, a.id)
    from public.applications a
    join public.job_agreements g on g.application_id = a.id
    where a.job_id = v_due.id
      and a.status = 'selected'
      and g.status = 'confirmed';
    v_requested := v_requested + 1;
  end loop;
  return v_requested;
end;
$$;

select cron.schedule(
  'request-job-outcomes',
  '7 * * * *',
  $$select public.request_job_outcomes()$$
);
