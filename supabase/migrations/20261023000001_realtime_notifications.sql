-- Vaitu · realtime notification changes for the bell.
-- The unread badge refetches the feed when notifications change (no polling):
-- a new row (someone applied, a decision landed), a withdrawal cascade, or a
-- peer device marking rows read all reach the open tab this way.
alter publication supabase_realtime add table public.notifications;
