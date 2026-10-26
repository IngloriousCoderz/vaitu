-- Vaitu · the oldest native build allowed to run. The iOS and Android apps
-- ship their web code inside the binary, so the service worker that keeps the
-- web app current never reaches them: at launch and on every resume they read
-- their platform's row here and, while their own build number (CFBundleVersion
-- / versionCode) is below `min_build`, show nothing but a screen sending the
-- user to the store. Raising `min_build` is how a release is made mandatory —
-- a row update, no deploy, since the binaries that must obey it are the old
-- ones already out there.
--
-- `store_url` lives here too so it can be fixed without a release. Null keeps
-- the screen up without a store button: on iOS until the App Store id exists.

create table public.app_versions (
  platform text primary key check (platform in ('ios', 'android')),
  min_build integer not null check (min_build >= 1),
  store_url text
);

alter table public.app_versions enable row level security;

-- Read before sign-in too: the sign-in screen is as much behind the gate as
-- the rest. No write policy: only the dashboard (service role) changes it.
create policy "Anyone reads the minimum app versions"
  on public.app_versions for select to anon, authenticated
  using (true);

insert into public.app_versions (platform, min_build, store_url) values
  ('ios', 1, null),
  ('android', 1, 'https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu');
