-- Vaitu · seeker favorite regions for market filtering.
alter table public.profiles
  add column favorite_regions text[] not null default '{}';
