-- What nothing points to anymore. A notification only points to a job or an
-- application, which keep their own state: read ones go after 30 days, any
-- after 90. Erasure links go once expired, and the scheduler's own log after a
-- week, since close-expired-jobs alone adds a run a minute.
create or replace function public.purge_old_rows()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.notifications
  where created_at < now() - interval '90 days'
    or (is_read and created_at < now() - interval '30 days');

  delete from public.account_erasures where expires_at < now();

  delete from cron.job_run_details where end_time < now() - interval '7 days';
$$;

select cron.schedule(
  'purge-old-rows',
  '41 3 * * *',
  $$select public.purge_old_rows()$$
);
