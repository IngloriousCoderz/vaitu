-- Vaitu · public bucket for generated .ics calendar files.
-- Seekers upload their own file, anyone can read it to import.
insert into storage.buckets (id, name, public)
values ('event-ics', 'event-ics', true)
on conflict (id) do update set public = true;

create policy "Anyone can read event ics"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-ics');

create policy "Users can upload their own ics"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Users can update their own ics"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-ics'
    and split_part(name, '/', 1) = auth.uid()::text
  );
