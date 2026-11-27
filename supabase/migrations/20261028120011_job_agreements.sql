-- What the poster and the winner say they agreed. The poster proposes,
-- the winner confirms, and a confirmed amount no longer changes. It's what
-- passes between them: what the poster pays an assistant, or the fee a
-- substitute gives the poster.
create table public.job_agreements (
  application_id uuid primary key references public.applications (id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  status text not null default 'proposed'
    check (status in ('proposed', 'confirmed', 'rejected')),
  proposed_at timestamptz not null default now(),
  answered_at timestamptz
);

alter table public.job_agreements enable row level security;

create policy "Both sides of a job can read its agreement"
  on public.job_agreements for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs e on e.id = a.job_id
      where a.id = job_agreements.application_id
        and (a.applicant_id = auth.uid() or e.poster_id = auth.uid())
    )
  );

revoke all on public.job_agreements from anon, authenticated;
grant select on public.job_agreements to authenticated;

create or replace function public.record_job_agreement(
  p_application_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_amount <= 0 then
    raise exception 'The amount must be more than zero.';
  end if;

  if exists (
    select 1
    from public.applications a
    join public.jobs e on e.id = a.job_id
    left join public.job_pay p on p.job_id = a.job_id
    where a.id = p_application_id
      and (
        (e.seeking = 'assistant' and p.kind = 'unpaid')
        or (e.seeking = 'substitute' and coalesce(p.fee_kind, 'none') = 'none')
      )
  ) then
    raise exception 'Nothing passes between you on this job.';
  end if;

  insert into public.job_agreements (application_id, amount, currency)
  select
    a.id,
    p_amount,
    coalesce((select currency from public.job_pay p where p.job_id = a.job_id), 'EUR')
  from public.applications a
  where a.id = p_application_id
  on conflict (application_id) do update
    set amount = excluded.amount,
        status = 'proposed',
        proposed_at = now(),
        answered_at = null
    where public.job_agreements.status <> 'confirmed';

  if not found then
    raise exception 'This agreement is already confirmed.';
  end if;
end;
$$;

create or replace function public.propose_job_agreement(
  p_application_id uuid,
  p_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
begin
  select a.* into v_application
  from public.applications a
  join public.jobs e on e.id = a.job_id
  where a.id = p_application_id
    and a.status = 'selected'
    and e.poster_id = auth.uid()
    and e.deleted_at is null;

  if not found then
    raise exception 'Only the poster can propose this agreement.';
  end if;

  perform public.record_job_agreement(p_application_id, p_amount);
  perform public.notify_user(
    v_application.applicant_id,
    'agreement_proposed',
    v_application.job_id,
    p_application_id
  );
end;
$$;

grant execute on function public.propose_job_agreement(uuid, numeric) to authenticated;

create or replace function public.answer_job_agreement(
  p_application_id uuid,
  p_is_confirmed boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_poster_id uuid;
  v_job_id uuid;
begin
  select e.poster_id, e.id into v_poster_id, v_job_id
  from public.applications a
  join public.jobs e on e.id = a.job_id
  where a.id = p_application_id
    and a.applicant_id = auth.uid()
    and a.status = 'selected'
    and e.deleted_at is null;

  if not found then
    raise exception 'Only the winner can answer this agreement.';
  end if;

  update public.job_agreements
  set status = case when p_is_confirmed then 'confirmed' else 'rejected' end,
      answered_at = now()
  where application_id = p_application_id and status = 'proposed';

  if not found then
    raise exception 'There is no agreement to answer.';
  end if;

  perform public.notify_user(
    v_poster_id,
    case when p_is_confirmed then 'agreement_confirmed' else 'agreement_rejected' end,
    v_job_id
  );
end;
$$;

grant execute on function public.answer_job_agreement(uuid, boolean) to authenticated;

-- Whether what was agreed was settled, from each side. It never says who owed
-- whom: the money can go either way, since sometimes the client pays the
-- original professional and sometimes the colleague who did the job.
create table public.job_settlements (
  application_id uuid not null references public.applications (id) on delete cascade,
  role text not null check (role in ('poster', 'winner')),
  is_settled boolean not null,
  answered_at timestamptz not null default now(),
  primary key (application_id, role)
);

alter table public.job_settlements enable row level security;

create policy "Both sides of a job can read its settlement"
  on public.job_settlements for select to authenticated
  using (
    exists (
      select 1
      from public.applications a
      join public.jobs e on e.id = a.job_id
      where a.id = job_settlements.application_id
        and (a.applicant_id = auth.uid() or e.poster_id = auth.uid())
    )
  );

revoke all on public.job_settlements from anon, authenticated;
grant select on public.job_settlements to authenticated;

create or replace function public.answer_job_settlement(
  p_application_id uuid,
  p_is_settled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application public.applications%rowtype;
  v_job public.jobs%rowtype;
  v_role text;
begin
  select * into v_application
  from public.applications
  where id = p_application_id and status = 'selected';

  if not found then
    raise exception 'Only the two sides of a job can answer this.';
  end if;

  select * into v_job
  from public.jobs
  where id = v_application.job_id and deleted_at is null;

  v_role := case
    when v_job.poster_id = auth.uid() then 'poster'
    when v_application.applicant_id = auth.uid() then 'winner'
  end;

  if v_role is null then
    raise exception 'Only the two sides of a job can answer this.';
  end if;

  if v_job.job_date > current_date then
    raise exception 'This can be answered once the date of the job has come.';
  end if;

  if not exists (
    select 1 from public.job_agreements
    where application_id = p_application_id and status = 'confirmed'
  ) then
    raise exception 'There is no confirmed agreement for this job.';
  end if;

  if exists (
    select 1 from public.job_reviews
    where application_id = p_application_id and outcome <> 'completed'
  ) then
    raise exception 'This job did not take place.';
  end if;

  insert into public.job_settlements (application_id, role, is_settled)
  values (p_application_id, v_role, p_is_settled);

  if not p_is_settled then
    perform public.notify_user(
      case when v_role = 'poster' then v_application.applicant_id else v_job.poster_id end,
      'settlement_contested',
      v_job.id,
      case when v_role = 'poster' then p_application_id end
    );
  end if;
end;
$$;

grant execute on function public.answer_job_settlement(uuid, boolean) to authenticated;
