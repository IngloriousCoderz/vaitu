-- Vaitu · touch_login() says whether it brought the account back.
--
-- Coming back is not an undo: deactivating deleted the applications the user
-- had sent and their open events. The app tells them so on the sign-in that
-- reactivates, and only that one — hence the boolean.
--
-- Reactivation is its own update, guarded on `not is_active`: the app calls
-- this more than once per sign-in (boot and the auth listener race), and the
-- row lock makes the second call re-check the guard and find nothing, so only
-- one of them reports true.

-- The return type changes, which `create or replace` cannot do.
drop function if exists public.touch_login();

create function public.touch_login()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;

  update public.profiles
  set last_login_at = now(), updated_at = now()
  where id = auth.uid();

  update public.profiles
  set is_active = true, deactivated_at = null
  where id = auth.uid() and not is_active;

  return found;
end;
$$;
revoke all on function public.touch_login() from public;
grant execute on function public.touch_login() to authenticated;
