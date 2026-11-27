-- Public buckets serve files by URL with no policy: select policies only decide
-- who can list, so nobody lists another user's folder. Calendars stay private
-- and go out as expiring links: they outlive the job they describe.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('job-ics', 'job-ics', false, 64 * 1024, array['text/calendar']),
  ('job-images', 'job-images', true, 5 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', true, 2 * 1024 * 1024, array['image/jpeg', 'image/png', 'image/webp']),
  -- The web app for the native apps, signed: only the service role writes it.
  ('live-updates', 'live-updates', true, 50 * 1024 * 1024, array['application/zip', 'application/json'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Users can list their own ics"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can upload their own ics"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can update their own ics"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'job-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'job-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Posters can list their own job images"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Posters can upload job images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Posters can update own job images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Posters can delete own job images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can list their own avatar"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can upload own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can update own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can delete own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and split_part(name, '/', 1) = auth.uid()::text
  );
