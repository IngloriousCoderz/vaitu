# Deploying

The local stack is Docker-only and never reaches the internet. Production is
two pieces deployed separately: the backend on Supabase Cloud and the
frontend on Netlify. Getting a new version in front of users who already have
the app is covered in [Releasing updates](releasing-updates.md).

## Backend

Production is Supabase Cloud, project ref `utzdcnnjxulwlsuhzjaq`
(`eu-central-1`), and the deployable units are the SQL migrations plus the
[edge functions](edge-functions.md) — there is no backend server process to
containerize.

```bash
supabase login
supabase link --project-ref utzdcnnjxulwlsuhzjaq
supabase db push                                        # apply migrations
supabase secrets set \
  DEEPGRAM_API_KEY=... OPENROUTER_API_KEY=...           # third-party keys
supabase functions deploy                               # every function
```

`supabase functions deploy` is required for every function change; `db push`
only covers SQL. `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — never set them
as secrets.

Check what is actually live:

```bash
supabase functions list --project-ref utzdcnnjxulwlsuhzjaq
supabase migration list --linked
supabase secrets list --project-ref utzdcnnjxulwlsuhzjaq
```

An empty function list with a working `db push` means every edge function is
404 in production. In the browser that surfaces as a CORS error on
`/functions/v1/*` — a missing function 404s before CORS headers are applied,
and `supabase-js` reports it as `TypeError: Failed to fetch`.

### Dashboard settings that no migration can set

`supabase/config.toml` `[auth]` applies to the **local** stack only. On the
cloud project these live under Authentication → URL Configuration:

- **Site URL** → `https://app.vaitu.net`
- **Redirect URLs** → add `https://app.vaitu.net/**`, plus any preview domain

Neither affects CORS. Signup asks for `<origin>/onboarding` as the
confirmation link's target; an origin missing from Redirect URLs falls back to
Site URL. Email confirmation is on in the cloud project (Authentication →
Providers → Email), so that link is how a new account gets its session; CORS
on the REST and Auth gateways is open by default and echoes the request
origin, which the preflight checks confirm is working.

## Frontend

`VITE_SUPABASE_URL` is inlined into `dist/` at build time, so Netlify needs it
as a build-time env var — the gitignored `.env` is not available there.

```bash
# Netlify: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set in the UI
pnpm build          # emits dist/
```

Traps worth knowing:

- `src/api/client.js` rewrites the URL to `http://<page-host>:54321` when the
  baked URL is localhost/127.0.0.1 and the page is served from a real host. It
  cannot fire when the cloud URL is baked in, but a Netlify build missing
  `VITE_SUPABASE_URL` will silently point every request at
  `https://app.vaitu.net:54321` and look exactly like a CORS failure.
- `dist/` is gitignored, so CI must run the build itself.
- Routes are resolved in the browser, so the host must answer every path that
  is not a file with `index.html`, or deep links and email confirmation links
  hit the host's 404. `public/_redirects` does it on Netlify, `vercel.json` on
  Vercel.

Next: [Releasing updates](releasing-updates.md).
