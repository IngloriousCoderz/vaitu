-- Vaitu · align required fields with the product spec
--
-- Spouse first names live in details jsonb (no DDL needed):
--   details = { "style": "fine_art", "spouseFirstName1": "...", "spouseFirstName2": "..." }
-- This migration only tightens nullability on top-level columns.

alter table public.events
  alter column location set not null,
  alter column country set not null,
  alter column region set not null,
  alter column event_date set not null,
  alter column application_deadline set not null;

alter table public.profiles
  alter column full_name set not null,
  alter column country set not null;
