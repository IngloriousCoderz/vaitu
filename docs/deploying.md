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
pnpm secrets:push                                       # third-party keys
supabase functions deploy                               # every function
```

`pnpm secrets:push` sends everything in `supabase/functions/.env` to the linked
project, overwriting the secrets of the same name, and then checks that production
holds exactly those values. `pnpm secrets:push ALERT_EMAIL` sends only the ones
you name. It is not `pnpm vault:push`, which sets the two values the database
itself needs to call `push-notify`.

`supabase functions deploy` is required for every function change; `db push`
only covers SQL. `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
`SUPABASE_SERVICE_ROLE_KEY` are injected by the platform — never set them
as secrets.

Vaitu is live, so a schema change must leave the data in place: a new file in
`supabase/migrations/`, which `supabase db push` applies on its own, or a
[small change](#small-schema-changes). The free tier
has no automatic backups, so take one first:
`supabase db dump --linked --data-only -f backup.sql`. It holds personal data, so
keep it out of the repository.

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

### Small schema changes

To keep the history short, a small change can go in the initial migration
instead of a new file. `db push` skips that file, so run the equivalent SQL once
on production, in the dashboard's SQL Editor:

```sql
alter table public.events drop constraint events_category_check;
alter table public.events add constraint events_category_check
  check (category in ('wedding', 'festival', 'concert', 'apartment', 'house', 'office'));
```

That is the statement for adding a category; the first line is for a constraint
that already exists. `supabase db diff --linked` then shows whether production
matches the migrations. Data stays in place, unless the change itself removes it.

### Starting over

⚠️ This deletes every account and all data, so it is only for a project with
nothing worth keeping: before a launch, or when starting a new app from this
code. A schema change then goes in the initial migration, and production
starts over from it:

```bash
supabase db reset --linked --no-seed
pnpm vault:push
```

`--no-seed` keeps out `seed.sql`, whose test accounts have a password written in
the README, and `seed-local.sql`, which holds the local stack's Vault values.

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
[Notifications](notifications.md#the-browser) and
[Analytics](analytics.md#setting-it-up)): without them, allowing
notifications in the PWA files no token, and the PWA measures nothing.

`VITE_SITE_URL` is the landing site, where the app links to the privacy policy
and terms. It is required.

`VITE_CONTACT_EMAIL` receives the requests for new job types. Without it, the
"Job type missing?" link is hidden. To add a job type, extend
`SETTINGS_BY_PROFESSION` in `src/data/event-taxonomy.js` and its copy in
`supabase/functions/parse-event/schema.ts`, and translate its `taxonomy.jobType`
label in every locale. No schema change is needed unless the job type brings a
new category: `events_category_check` lists them all, as described in
[Small schema changes](#small-schema-changes).

```bash
# Vercel: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_CONTACT_EMAIL,
# VITE_SITE_URL and the
# six VITE_FIREBASE_*
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

## Landing page

`landing/` is the public site at `https://www.vaitu.net`, built with
[SSX](https://www.npmjs.com/package/@inglorious/ssx). It also holds the privacy
policy and the terms, which store listings can link to: `/privacy`, `/en/privacy`
and so on. It has its own
`package.json`, lockfile and `pnpm-workspace.yaml`, so deploying it doesn't
install the app. `pnpm landing` runs it locally. Its wording, the legal text
included, lives in `landing/src/i18n/`; Italian is served at `/`, the others at `/en`, `/fr`, `/ja`
and `/ar`.

It is a second Vercel project on the same repository:

1. Add a project from this repository, with **Root Directory** set to `landing`.
   `landing/vercel.json` holds the build settings.
2. Set `VITE_SITE_URL`, `VITE_APP_URL`, `VITE_LEGAL_NAME` and
   `VITE_CONTACT_EMAIL`, as in `landing/.env.example`.
3. Add the domain `www.vaitu.net`, and `vaitu.net` redirecting to it.
4. So each push only rebuilds what changed, set **Ignored Build Step** on both
   projects: `git diff --quiet HEAD^ HEAD -- .` on the landing project, and
   `git diff --quiet HEAD^ HEAD -- . ':!landing'` on the app's.

Next: [Releasing updates](releasing-updates.md).
