-- Push Layer 2: endpoint rows + the wake that turns a notifications insert
-- into a Web Push. The CAS column pushed_at lives on notifications so the
-- edge function can claim a row exactly once; the trigger only wakes —
-- it never sends.

create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

-- Exactly-once claim for push-notify: null -> now() under READ COMMITTED.
alter table public.notifications
  add column if not exists pushed_at timestamptz;

-- Wake chain: AFTER INSERT on notifications -> pg_net -> Kong -> push-notify.
-- URL and service-role key live in Vault (names: project_url, service_role_key)
-- so migrations never embed secrets. Local seed fills the demo values; cloud
-- sets them once in the SQL editor. Missing secrets skip the wake — Layer 1
-- still lands the feed row.
create or replace function public.vaitu_wake_push()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_base text;
  secret_key text;
begin
  select decrypted_secret into edge_base
  from vault.decrypted_secrets
  where name = 'project_url'
  limit 1;

  select decrypted_secret into secret_key
  from vault.decrypted_secrets
  where name = 'service_role_key'
  limit 1;

  if edge_base is null or secret_key is null then
    return new;
  end if;

  perform net.http_post(
    url := rtrim(edge_base, '/') || '/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret_key,
      'apikey', secret_key
    ),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception when others then
  -- Never fail the insert that already wrote the feed row.
  raise warning 'vaitu_wake_push: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists trg_vaitu_wake_push on public.notifications;
create trigger trg_vaitu_wake_push
  after insert on public.notifications
  for each row execute function public.vaitu_wake_push();
