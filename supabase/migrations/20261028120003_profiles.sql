-- One row per account, readable and writable only by its owner.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  website text,
  phone text,
  country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  favorite_regions text[] not null default '{}',
  interested_settings text[] not null default '{}',
  professions text[] not null default '{}',
  locale text,
  avatar_url text,
  is_active boolean not null default true,
  last_login_at timestamptz,
  deactivated_at timestamptz,
  is_email_opted_out boolean not null default false,
  onboarded_at timestamptz,
  has_new_job_alerts boolean not null default true
);

comment on column public.profiles.interested_settings is
  'Settings the feed shows by default. Empty means all of them.';
comment on column public.profiles.professions is
  'Professions the feed shows by default. Empty means every profession.';
comment on column public.profiles.is_active is
  'False after the user deactivates; true again on the next successful login.';
comment on column public.profiles.last_login_at is
  'Updated on each successful session (including reactivation).';
comment on column public.profiles.deactivated_at is
  'When the user last chose Deactivate account; cleared on reactivation.';
comment on column public.profiles.is_email_opted_out is
  'When true, do not send re-engagement (or other marketing) email.';
comment on column public.profiles.onboarded_at is
  'When the user finished or skipped onboarding; null while it is still owed.';
comment on column public.profiles.has_new_job_alerts is
  'Whether a new job matching the user''s trades and regions notifies them.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Reads is_active without RLS (avoids jobs ↔ profiles policy recursion).
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

grant execute on function public.is_active_profile(uuid) to anon, authenticated;

-- Reactivation is its own guarded update: boot and the auth listener race to
-- call this, and the row lock lets only one report true.
create function public.touch_login()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  update public.profiles
  set last_login_at = now(), updated_at = now()
  where id = auth.uid();

  update public.profiles
  set is_active = true, deactivated_at = null
  where id = auth.uid() and not is_active;

  if not found then
    return false;
  end if;

  -- Back on the account, so the link in the deactivation email stops working.
  delete from public.account_erasures where user_id = auth.uid();
  return true;
end;
$$;

grant execute on function public.touch_login() to authenticated;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Supabase grants every privilege by default and policies only pick rows:
-- without these column grants an owner could rewrite any column.
revoke insert, update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (
  full_name,
  website,
  phone,
  country,
  favorite_regions,
  interested_settings,
  professions,
  locale,
  avatar_url,
  onboarded_at,
  is_email_opted_out,
  has_new_job_alerts
) on public.profiles to authenticated;
