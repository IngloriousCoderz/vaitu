-- Vaitu · close expired events every minute.
-- Time alone never touches a row, so realtime can only fire after this
-- flips expired statuses. Cloud: schedule via dashboard/pg_cron instead.
create extension if not exists pg_cron;

select cron.schedule(
  'close-expired-events',
  '* * * * *',
  $$select public.close_expired_events()$$
);
