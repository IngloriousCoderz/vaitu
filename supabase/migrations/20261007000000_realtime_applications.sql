-- Vaitu · realtime application changes for sender counts.
-- My Events refetches counts when applications change (no polling).
alter publication supabase_realtime add table public.applications;
