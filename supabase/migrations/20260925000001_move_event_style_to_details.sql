-- Vaitu · move events.style into details jsonb
--
-- Category-specific fields (wedding style, spouse names, future categories')
-- live in details so new categories need no DDL.

-- 1. Backfill: fold any existing style values into details.
update public.events
set details = coalesce(details, '{}'::jsonb) || jsonb_build_object('style', style),
    updated_at = now()
where style is not null;

-- 2. Drop the column.
alter table public.events drop column style;

-- 3. Indexes for details filtering.
-- GIN covers containment queries, e.g. details @> '{"style":"editorial"}'.
create index events_details_gin_idx on public.events using gin (details);

-- B-tree expression index covers key extraction,
-- e.g. details->>'style' = 'editorial'.
create index events_details_style_idx on public.events ((details ->> 'style'));
