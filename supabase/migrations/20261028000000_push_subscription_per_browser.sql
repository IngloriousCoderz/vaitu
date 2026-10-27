-- Notifications, layer 2: a browser endpoint belongs to one user at a time,
-- whoever last signed in there, so two people sharing a laptop never both
-- get pushes on it. Keyed by (user, endpoint) instead, every user who ever
-- signed in on a browser kept a row for it, and the sign-out meant to
-- remove it ran after the token was gone, so RLS deleted nothing.

-- The newest row of each endpoint is the browser's current user.
delete from public.push_subscriptions older
using public.push_subscriptions newer
where older.endpoint = newer.endpoint
  and (older.created_at, older.id) < (newer.created_at, newer.id);

alter table public.push_subscriptions
  drop constraint push_subscriptions_user_id_endpoint_key,
  drop constraint push_subscriptions_pkey,
  drop column id,
  add primary key (endpoint);

-- Writes go through save_push_subscription: the endpoint may still be held by
-- the previous user of this browser (a sign-out that could not reach the
-- server), and RLS would hide that row from the one taking it over.
drop policy "Users can manage their own push subscriptions"
  on public.push_subscriptions;

create policy "Users can read their own push subscriptions"
  on public.push_subscriptions for select
  using (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  using (auth.uid() = user_id);

create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth)
  values (p_endpoint, auth.uid(), p_p256dh, p_auth)
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth;
end;
$$;
revoke all on function public.save_push_subscription(text, text, text)
  from public;
grant execute on function public.save_push_subscription(text, text, text)
  to authenticated;

-- The wake, for recipients with somewhere to push to only: most have none,
-- and each wake is an HTTP call. The URL and the service-role key it calls
-- with live in Vault (project_url, service_role_key): supabase/seed.sql sets
-- the local ones, docs/deploying.md says how to set the cloud ones. pg_net
-- sends once the insert commits, so push-notify finds the row.
create or replace function public.vaitu_wake_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  if not exists (
    select 1 from public.push_subscriptions where user_id = new.user_id
  ) then
    return new;
  end if;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into v_key
  from vault.decrypted_secrets where name = 'service_role_key';
  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- A push is a courtesy on top of the feed: it never fails the insert.
  raise warning 'vaitu_wake_push: %', sqlerrm;
  return new;
end;
$$;
