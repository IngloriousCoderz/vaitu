-- Vaitu · foundations. The schema is split by concern, one file each, in the
-- order they depend on one another. Throughout:
-- - Access is ownership: jobs.poster_id, applications.applicant_id.
-- - profiles is own-row only; the poster's name comes from job_poster_name(),
-- an applicant's contact details and photo from applicant_profiles().
-- - Deadlines close jobs through close_expired_jobs() on pg_cron: triggers
-- cannot fire on time.
-- - Job policies must NOT select profiles under RLS: it recurses through the
-- applicants policy. is_active_profile() is security definer for this.
-- - RLS picks the rows a client may update, column grants pick the columns.
-- - Withdrawals and deleted jobs stay as rows: they are other people's
-- history and a user's track record, which profile_stats() scores. Everything
-- personal in a deleted job is wiped, and RLS hides it.
-- - Functions are callable only where granted: by default anon could call
-- security definer ones.

create extension if not exists pg_cron;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

create or replace function public.immutable_unaccent(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, value)
$$;
-- Created before the default privileges below, so it starts out callable by
-- everyone. Only inserting or updating a job computes search_text with it.
revoke execute on function public.immutable_unaccent(text) from public, anon;
grant execute on function public.immutable_unaccent(text) to authenticated;
create extension if not exists pg_net with schema extensions;

alter default privileges revoke execute on functions from public;
alter default privileges in schema public
  revoke execute on functions from anon, authenticated;


create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
