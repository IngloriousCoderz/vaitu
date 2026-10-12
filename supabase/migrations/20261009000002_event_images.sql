-- Vaitu · event images (one or more per event).
alter table public.events
  add column image_urls text[] not null default '{}';

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do update set public = true;

create policy "Anyone can read event images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-images');

create policy "Senders can upload event images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can update own event images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can delete own event images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );
