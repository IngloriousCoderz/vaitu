-- Vaitu · filtered realtime needs full replica identity.
-- postgres_changes filters on UPDATE/DELETE rows are only evaluated when
-- the full row is replicated; otherwise filtered channels stay silent.
alter table public.events replica identity full;
alter table public.applications replica identity full;
