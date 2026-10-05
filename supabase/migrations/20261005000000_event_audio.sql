-- Vaitu · pre-recorded event audio.
-- Adds audio_url + transcript + transcript_status to events, plus a public
-- bucket `event-audio` (senders upload under their own uid folder).
-- Transcription itself lands later (edge function); upload/player first.

alter table public.events
  add column audio_url text,
  add column transcript text,
  add column transcript_status text not null default 'none'
    check (transcript_status in ('none', 'pending', 'done', 'error'));

insert into storage.buckets (id, name, public)
values ('event-audio', 'event-audio', true)
on conflict (id) do update set public = true;

create policy "Anyone can read event audio"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'event-audio');

create policy "Senders can upload event audio"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can update own event audio"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "Senders can delete own event audio"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'event-audio'
    and split_part(name, '/', 1) = auth.uid()::text
  );
