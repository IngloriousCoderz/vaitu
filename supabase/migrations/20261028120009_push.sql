-- Push on top of the feed: each new notification wakes the push-notify edge
-- function for users with a device registered.

create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null check (platform in ('web', 'android', 'ios')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy "Users can read their own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "Users can delete their own push tokens"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create function public.save_push_token(
  p_token text,
  p_platform text
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

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform;
end;
$$;

grant execute on function public.save_push_token(text, text)
  to authenticated;

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
    select 1 from public.push_tokens where user_id = new.user_id
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

create trigger trg_vaitu_wake_push
  after insert on public.notifications
  for each row execute function public.vaitu_wake_push();
