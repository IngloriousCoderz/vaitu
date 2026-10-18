-- Vaitu · the user's language. Null until the app first saves one; the app
-- then sets it from whatever language the user is seeing.
alter table public.profiles add column locale text;
