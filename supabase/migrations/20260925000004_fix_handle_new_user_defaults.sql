-- Vaitu · handle_new_user must satisfy NOT NULL columns (full_name, country).
-- The app collects the real values during onboarding and updates the row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, country)
  values (
    new.id,
    'seeker',
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'country', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
