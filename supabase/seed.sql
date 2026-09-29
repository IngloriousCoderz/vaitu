-- Vaitu · local seed: 1 sender + 6 open wedding events.
-- Mirrors the former static mock (src/data/events.js, since removed).
-- Applied on `supabase db reset`. Rerunning on a non-fresh DB duplicates rows.

do $$
declare
  v_sender_id uuid := gen_random_uuid();
begin
  -- auth user (handle_new_user trigger auto-creates the profile row).
  -- raw_app_meta_data must list the email provider or password login fails.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, phone_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (
    '00000000-0000-0000-0000-000000000000',
    v_sender_id,
    'authenticated',
    'authenticated',
    'sender@vaitu.local',
    extensions.crypt('test1234', extensions.gen_salt('bf')),
    now(),
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Test Sender"}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  -- GoTrue v2 requires an identity row for login.
  insert into auth.identities (user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    v_sender_id,
    jsonb_build_object('sub', v_sender_id::text, 'email', 'sender@vaitu.local'),
    'email',
    v_sender_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  update public.profiles
  set role = 'sender',
      full_name = 'Test Sender',
      country = 'Italy',
      region = 'Tuscany',
      website = 'https://example.com',
      instagram_handle = '@testsender'
  where id = v_sender_id;

  insert into public.events
    (sender_id, category, title, location, country, region, event_date, application_deadline, max_applicants, status, details, created_at)
  values
    (v_sender_id, 'wedding', 'Sophie & Leo', 'Florence', 'Italy', 'Tuscany', '2026-10-24', now() + interval '2 days', 5, 'open',
      '{"style":"fine_art","spouse_first_name_1":"Sophie","spouse_first_name_2":"Leo"}', now() - interval '10 days'),
    (v_sender_id, 'wedding', 'Mara & James', 'Amalfi Coast', 'Italy', 'Campania', '2026-11-07', now() + interval '5 days', 5, 'open',
      '{"style":"editorial","spouse_first_name_1":"Mara","spouse_first_name_2":"James"}', now() - interval '10 days'),
    (v_sender_id, 'wedding', 'Ines & Paul', 'Paris', 'France', 'Île-de-France', '2026-10-03', now() + interval '20 hours', 5, 'open',
      '{"style":"film","spouse_first_name_1":"Ines","spouse_first_name_2":"Paul"}', now() - interval '10 days'),
    (v_sender_id, 'wedding', 'Heidi & Karl', 'Berlin', 'Germany', 'Berlin', '2026-11-21', now() + interval '21 days', 5, 'open',
      '{"style":"classic","spouse_first_name_1":"Heidi","spouse_first_name_2":"Karl"}', now()),
    (v_sender_id, 'wedding', 'Luca & Mia', 'Venice', 'Italy', 'Veneto', '2026-10-18', now() + interval '3 days', 5, 'open',
      '{"style":"reportage","spouse_first_name_1":"Luca","spouse_first_name_2":"Mia"}', now() - interval '10 days'),
    (v_sender_id, 'wedding', 'Anna & Sam', 'Cotswolds', 'UK', 'England', '2026-12-05', now() + interval '7 days', 5, 'open',
      '{"style":"documentary","spouse_first_name_1":"Anna","spouse_first_name_2":"Sam"}', now() - interval '10 days'),
    (v_sender_id, 'festival', 'Sundance Beats', 'Palm Springs', 'USA', 'California', '2026-11-14', now() + interval '4 days', 5, 'open',
      '{"genre":"electronic","headliner":"Neon Coastline"}', now() - interval '10 days'),
    (v_sender_id, 'festival', 'Solstice Folk', 'Asheville', 'USA', 'North Carolina', '2026-10-31', now() + interval '6 days', 5, 'open',
      '{"genre":"indie","headliner":"The Wandering Lights"}', now() - interval '10 days');
end;
$$;
