# Deploying

The local stack is Docker-only and never reaches the internet. Production is
two pieces deployed separately: the backend on Supabase Cloud and the
frontend on Vercel. Getting a new version in front of users who already have
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
  DEEPGRAM_API_KEY=... OPENROUTER_API_KEY=... \
  FCM_SERVICE_ACCOUNT="$(cat service-account.json)"     # third-party keys
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

### Resetting before launch

Until launch, production holds nothing worth keeping, so a schema change goes
in the initial migration and production starts over from it, test accounts
and events included:

```bash
supabase db reset --linked --sql-paths ./seed.sql
pnpm vault:push
```

`--sql-paths ./seed.sql` leaves out `seed-local.sql`, which holds the local
stack's Vault values (its gateway, `http://kong:8000`, and its demo key);
forgetting it does no harm, since `vault:push` overwrites them.

### Push wake-up

The trigger that wakes `push-notify` reads the project URL and the legacy
`service_role` key from Vault, so neither is in a migration or a seed.
`pnpm vault:push` (`scripts/push-vault-secrets.mjs`) sets both on the linked
project, taking the key from the Supabase CLI's login, so it is never written
down. It must be the legacy key, the one starting `eyJ`: `push-notify` reads
the caller's role out of it, which the newer `sb_secret_` keys do not carry.

Until both are set, notifications still reach the bell but no push is sent.

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

The frontend is the Vercel project `inglorious-vaitu`, served at
`https://app.vaitu.net` (a CNAME to `inglorious-vaitu.vercel.app`).

`VITE_SUPABASE_URL` is inlined into `dist/` at build time, so Vercel needs it
as a build-time env var — the gitignored `.env` is not available there. The
same goes for the `VITE_FIREBASE_*` values (see
[Notifications](notifications.md#the-browser)): without them, allowing
notifications in the PWA files no token.

```bash
# Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and the five VITE_FIREBASE_*
# set in Project Settings → Environment Variables (Production), then redeploy
pnpm build          # emits dist/
```

Traps worth knowing:

- `src/api/client.js` rewrites the URL to `http://<page-host>:54321` when the
  baked URL is localhost/127.0.0.1 and the page is served from a real host. It
  cannot fire when the cloud URL is baked in, but a Vercel build missing
  `VITE_SUPABASE_URL` will silently point every request at
  `https://app.vaitu.net:54321` and look exactly like a CORS failure.
- `dist/` is gitignored, so CI must run the build itself.
- Routes are resolved in the browser, so the host must answer every path that
  is not a file with `index.html`, or deep links and email confirmation links
  hit the host's 404. `vercel.json` rewrites them.

Next: [Releasing updates](releasing-updates.md).
