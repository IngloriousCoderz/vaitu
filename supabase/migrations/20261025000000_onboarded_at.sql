-- Vaitu · remember that onboarding was offered, on the profile.
--
-- With email confirmation the signup and the first session happen in
-- different tabs, often on different devices, so the browser cannot carry
-- "onboarding is owed" from one to the other. The profile can.
--
-- A timestamp rather than a check on missing fields: onboarding can be
-- skipped, and a skipped profile is just as empty as a fresh one.

alter table public.profiles
  add column if not exists onboarded_at timestamptz;

comment on column public.profiles.onboarded_at is
  'When the user finished or skipped onboarding; null while it is still owed.';

-- Everyone already here was offered onboarding at signup.
update public.profiles
set onboarded_at = created_at
where onboarded_at is null;
