-- Vaitu · denormalize email into profiles for admin lookup.
-- auth.users stays the source of truth; this column is synced by triggers
-- (signup + email change) so it can never diverge silently.

alter table public.profiles add column email text;

-- Backfill existing rows.
update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id;

alter table public.profiles alter column email set not null;

create unique index profiles_email_uidx on public.profiles (email);

-- Keep handle_new_user writing email on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, country, email)
  values (
    new.id,
    'seeker',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Sync email changes.
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email, updated_at = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_profile_email_on_change on auth.users;

create trigger sync_profile_email_on_change
  after update of email on auth.users
  for each row execute function public.sync_profile_email();
