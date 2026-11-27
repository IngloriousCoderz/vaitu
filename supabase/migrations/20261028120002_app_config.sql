-- Settings the app reads: the numbers behind scores, badges and daily limits,
-- and the oldest native builds still allowed.

create table public.app_config (
  key text primary key,
  value integer not null,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_config (key, value, description) values
  ('points_per_completed_job', 20, 'Points per job the poster confirmed as done.'),
  ('points_per_completed_handoff', 10, 'Points per job passed on that the poster confirmed as done.'),
  ('review_good_min_stars', 4, 'Stars from which a review counts as good.'),
  ('review_poor_max_stars', 2, 'Stars up to which a review counts as poor.'),
  ('points_per_good_review', 5, 'Points per good review.'),
  ('points_per_poor_review', -10, 'Points per poor review.'),
  ('points_per_dropout', -15, 'Points per job withdrawn from after winning it.'),
  ('points_per_no_show', -30, 'Points per job the poster reported as a no-show.'),
  ('tier_bronze_min_points', 25, 'Minimum points for bronze tier.'),
  ('tier_silver_min_points', 100, 'Minimum points for silver tier.'),
  ('tier_gold_min_points', 250, 'Minimum points for gold tier.'),
  ('badge_serial_applicant_min_applications', 10, 'Applications for the Serial Applicant badge.'),
  ('badge_serial_withdrawer_min_withdrawals', 3, 'Withdrawals for the Serial Withdrawer badge.'),
  ('badge_serial_withdrawer_min_percent', 33, 'Share of applications withdrawn for the Serial Withdrawer badge.'),
  ('badge_unreliable_min_failures', 2, 'Dropouts plus no-shows for the Unreliable badge.'),
  ('badge_reliable_min_jobs', 3, 'Completed jobs, with no failures, for the Reliable badge.'),
  ('badge_top_rated_min_reviews', 3, 'Reviews for the Top Rated badge.'),
  ('badge_top_rated_min_tenths', 45, 'Average rating, in tenths of a star, for the Top Rated badge.'),
  ('badge_generous_min_handoffs', 3, 'Jobs handed off for the Generous Colleague badge.'),
  ('points_per_payment_issue', -20, 'Points per uncontested report of not settling what was agreed.'),
  ('settlement_reply_days', 14, 'Days to contradict a report of not settling before it counts.'),
  ('badge_payment_issues_min', 2, 'Payment issues for the Payment Issues badge.'),
  ('voice_daily_limit', 3, 'Voice messages a user can transcribe, and parse, per day.'),
  ('voice_daily_minutes', 120, 'Minutes of audio everyone together can transcribe per day.'),
  ('reports_daily_limit', 5, 'Reports a user can send per day.');

alter table public.app_config enable row level security;

create policy "Anyone can read app config"
  on public.app_config for select to anon, authenticated
  using (true);

grant select on public.app_config to anon, authenticated;


-- Raising min_build makes a release mandatory: the native apps carry their web
-- code, so the service worker never updates them.
create table public.app_versions (
  platform text primary key check (platform in ('ios', 'android')),
  min_build integer not null check (min_build >= 1),
  store_url text
);

alter table public.app_versions enable row level security;

create policy "Anyone reads the minimum app versions"
  on public.app_versions for select to anon, authenticated
  using (true);

insert into public.app_versions (platform, min_build, store_url) values
  ('ios', 6, 'https://apps.apple.com/app/id6830630579'),
  ('android', 6, 'https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu');
