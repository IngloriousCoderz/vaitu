-- Who keeps whom apart. Earlier than jobs: their policies hide a blocked
-- poster's jobs.

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  -- The blocker may no longer be allowed to read the blocked person's profile.
  blocked_name text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- Either way round: a block keeps both people apart.
create or replace function public.are_blocked(p_first uuid, p_second uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_first and blocked_id = p_second)
       or (blocker_id = p_second and blocked_id = p_first)
  );
$$;

grant execute on function public.are_blocked(uuid, uuid) to anon, authenticated;

alter table public.blocks enable row level security;

create policy "Users can read their own blocks"
  on public.blocks for select to authenticated
  using (blocker_id = auth.uid());

create policy "Users can remove their own blocks"
  on public.blocks for delete to authenticated
  using (blocker_id = auth.uid());

revoke all on table public.blocks from anon, authenticated;
grant select, delete on public.blocks to authenticated;

-- Withdrawn with no withdrawn_from, like deactivation: not the applicant's
-- doing, so it does not count against them.
create or replace function public.block_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is null or p_user_id = auth.uid() then
    raise exception 'You cannot block this user.';
  end if;

  insert into public.blocks (blocker_id, blocked_id, blocked_name)
  values (
    auth.uid(),
    p_user_id,
    (select full_name from public.profiles where id = p_user_id)
  )
  on conflict do nothing;

  perform set_config('vaitu.withdrawing', 'on', true);
  update public.applications a
  set status = 'withdrawn',
      withdrawn_at = now(),
      status_before_assign = null
  from public.jobs e
  where e.id = a.job_id
    and e.status = 'open'
    and a.status in ('pending', 'shortlisted')
    and (
      (e.poster_id = auth.uid() and a.applicant_id = p_user_id)
      or (e.poster_id = p_user_id and a.applicant_id = auth.uid())
    );
  perform set_config('vaitu.withdrawing', 'off', true);
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;
