-- What a job pays. Apart from jobs, which anyone can read and realtime
-- broadcasts: what passes between colleagues is theirs, not the client's.
-- The amounts are what the colleague earns: from the client when they take
-- over as a substitute, from the poster when they assist. The fee is what a
-- substitute gives the poster for the client, a set amount or a percentage
-- of what the client pays, and only substitute jobs have one.
create table public.job_pay (
  job_id uuid primary key references public.jobs (id) on delete cascade,
  kind text not null default 'to_agree' check (kind in ('fixed', 'range', 'to_agree', 'unpaid')),
  amount_min numeric check (amount_min > 0),
  amount_max numeric check (amount_max > 0),
  currency text not null default 'EUR' check (char_length(currency) = 3),
  fee_kind text not null default 'none'
    check (fee_kind in ('none', 'fixed', 'percent', 'to_agree')),
  fee_amount numeric check (fee_amount > 0),
  check (
    (kind in ('to_agree', 'unpaid') and amount_min is null and amount_max is null)
    or (kind = 'fixed' and amount_min is not null and amount_max is null)
    or (kind = 'range' and amount_min is not null and amount_max > amount_min)
  ),
  check (
    (fee_kind in ('none', 'to_agree') and fee_amount is null)
    or (fee_kind = 'fixed' and fee_amount is not null)
    or (fee_kind = 'percent' and fee_amount is not null and fee_amount <= 100)
  )
);

create or replace function public.enforce_job_pay_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.fee_kind <> 'none' and exists (
    select 1 from public.jobs e
    where e.id = new.job_id and e.seeking = 'assistant'
  ) then
    raise exception 'Only a substitute owes the poster a fee.';
  end if;
  return new;
end;
$$;

create trigger trg_job_pay_fee
  before insert or update on public.job_pay
  for each row execute function public.enforce_job_pay_fee();

-- An assistant owes nothing: a job that turns into one drops its fee.
create or replace function public.drop_assistant_fee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.job_pay
  set fee_kind = 'none', fee_amount = null
  where job_id = new.id and fee_kind <> 'none';
  return new;
end;
$$;

create trigger trg_jobs_assistant_fee
  after update of seeking on public.jobs
  for each row
  when (new.seeking = 'assistant' and old.seeking <> 'assistant')
  execute function public.drop_assistant_fee();

alter table public.job_pay enable row level security;

create policy "Signed-in users read the pay of jobs they can see"
  on public.job_pay for select to authenticated
  using (exists (select 1 from public.jobs e where e.id = job_id));

create policy "Posters write the pay of their own jobs"
  on public.job_pay for all to authenticated
  using (
    exists (
      select 1 from public.jobs e
      where e.id = job_id and e.poster_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.jobs e
      where e.id = job_id and e.poster_id = auth.uid()
    )
  );

revoke all on public.job_pay from anon, authenticated;
grant select, insert, update on public.job_pay to authenticated;
