
do $$
declare
  v_giada_id uuid := gen_random_uuid();
  v_antony_id uuid := gen_random_uuid();
begin
  -- auth user (handle_new_user trigger auto-creates the profile row).
  -- raw_app_meta_data must list the email provider or password login fails.
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, phone_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (
    '00000000-0000-0000-0000-000000000000',
    v_giada_id,
    'authenticated',
    'authenticated',
    'giada@vaitu.local',
    extensions.crypt('vaitu-local', extensions.gen_salt('bf')),
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
    '{"full_name":"Giada Cazzola"}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into auth.identities (user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    v_giada_id,
    jsonb_build_object('sub', v_giada_id::text, 'email', 'giada@vaitu.local'),
    'email',
    v_giada_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  update public.profiles
  set full_name = 'Giada Cazzola',
      country = 'Italy',
      website = 'https://giada.example.com',
      phone = '+39 333 000 0001',
      onboarded_at = now()
  where id = v_giada_id;

  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change_token_current, email_change, phone_change_token, phone_change, reauthentication_token, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values (
    '00000000-0000-0000-0000-000000000000',
    v_antony_id,
    'authenticated',
    'authenticated',
    'antony@vaitu.local',
    extensions.crypt('vaitu-local', extensions.gen_salt('bf')),
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
    '{"full_name":"Matteo Antony Mistretta"}',
    now(),
    now()
  )
  on conflict (id) do nothing;

  insert into auth.identities (user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  values (
    v_antony_id,
    jsonb_build_object('sub', v_antony_id::text, 'email', 'antony@vaitu.local'),
    'email',
    v_antony_id::text,
    now(),
    now(),
    now()
  )
  on conflict (provider_id, provider) do nothing;

  update public.profiles
  set full_name = 'Matteo Antony Mistretta',
      country = 'Italy',
      website = 'https://antony.example.com',
      phone = '+39 333 000 0002',
      onboarded_at = now()
  where id = v_antony_id;

  insert into public.jobs
    (poster_id, category, profession, title, location, country, region, job_date, application_deadline, max_applicants, status, details, created_at)
  values
    (v_giada_id, 'wedding', 'photographer', 'Sophie & Leo', 'Florence', 'Italy', 'Tuscany', '2026-10-24', now() + interval '2 days', 5, 'open',
      '{"style":"fine_art","spouse_first_name_1":"Sophie","spouse_first_name_2":"Leo"}', now() - interval '10 days'),
    (v_giada_id, 'wedding', 'photographer', 'Mara & James', 'Amalfi Coast', 'Italy', 'Campania', '2026-11-07', now() + interval '5 days', 5, 'open',
      '{"style":"editorial","spouse_first_name_1":"Mara","spouse_first_name_2":"James"}', now() - interval '10 days'),
    (v_giada_id, 'wedding', 'photographer', 'Ines & Paul', 'Paris', 'France', 'Île-de-France', '2026-10-03', now() + interval '20 hours', 5, 'open',
      '{"style":"film","spouse_first_name_1":"Ines","spouse_first_name_2":"Paul"}', now() - interval '10 days'),
    (v_giada_id, 'wedding', 'photographer', 'Heidi & Karl', 'Berlin', 'Germany', 'Berlin', '2026-11-21', now() + interval '21 days', 5, 'open',
      '{"style":"classic","spouse_first_name_1":"Heidi","spouse_first_name_2":"Karl"}', now()),
    (v_giada_id, 'wedding', 'photographer', 'Luca & Mia', 'Venice', 'Italy', 'Veneto', '2026-10-18', now() + interval '3 days', 5, 'open',
      '{"style":"reportage","spouse_first_name_1":"Luca","spouse_first_name_2":"Mia"}', now() - interval '10 days'),
    (v_giada_id, 'wedding', 'photographer', 'Anna & Sam', 'Cotswolds', 'UK', 'England', '2026-12-05', now() + interval '7 days', 5, 'open',
      '{"style":"documentary","spouse_first_name_1":"Anna","spouse_first_name_2":"Sam"}', now() - interval '10 days'),
    (v_giada_id, 'festival', 'sound_technician', 'Sundance Beats', 'Palm Springs', 'USA', 'California', '2026-11-14', now() + interval '4 days', 5, 'open',
      '{"genre":"electronic","headliner":"Neon Coastline"}', now() - interval '10 days'),
    (v_giada_id, 'festival', 'photographer', 'Solstice Folk', 'Asheville', 'USA', 'North Carolina', '2026-10-31', now() + interval '6 days', 5, 'open',
      '{"genre":"indie","headliner":"The Wandering Lights"}', now() - interval '10 days'),
    (v_giada_id, 'apartment', 'cleaner', 'Deep clean, two-bedroom apartment', 'Isola', 'Italy', 'Lombardy', '2026-11-28', now() + interval '8 days', 5, 'open',
      '{}', now() - interval '1 day'),
    (v_giada_id, 'office', 'cleaner', 'Weekly clean, small office', 'Rifredi', 'Italy', 'Tuscany', '2026-11-30', now() + interval '9 days', 5, 'open',
      '{}', now() - interval '1 day'),
    (v_giada_id, 'house', 'electrician', 'Replace the sockets on one floor', 'Fiesole', 'Italy', 'Tuscany', '2026-12-02', now() + interval '10 days', 5, 'open',
      '{}', now() - interval '1 day');
end;
$$;
