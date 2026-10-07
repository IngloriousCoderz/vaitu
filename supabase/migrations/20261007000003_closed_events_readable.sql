-- Vaitu · closed events stay readable (detail shows the closed state).
-- Rows are still insert/update/delete-protected by the sender policies.
create policy "Anyone can view closed events"
  on public.events for select to anon, authenticated
  using (status <> 'open');
