# Development

This picks up where [Getting started](../README.md#getting-started) leaves off: the app is running against a local backend, and this is what you need to work on it.

## Project structure

- `index.html`: the main entry point for the app.
- `src/`: the app's JavaScript source code.
- `src/api/client.js`: Supabase client setup.
- `supabase/`: migrations, seed data, `config.toml` and
  [edge functions](edge-functions.md).
- `vite.config.js`: Vite configuration.
- `capacitor.config.ts`: Capacitor (mobile) configuration.
- `docs/`: these guides.
- `landing/`: the public site, a separate project (see
  [Deploying](deploying.md#landing-page)).

## Local backend (Supabase)

> Local data lives in Docker volumes on your machine — it never touches
> Supabase Cloud. The cloud project (`utzdcnnjxulwlsuhzjaq`) is deployed
> separately — see [Deploying](deploying.md).

### Frontend env

`.env.local` holds the API URL and publishable key from `supabase status`
(see [Getting started](../README.md#getting-started)). On a physical Android
device, replace `127.0.0.1` with your computer LAN IP (see
[Mobile](mobile.md)) — the emulator uses `10.0.2.2` instead.

Keep `VITE_TURNSTILE_SITE_KEY=` empty there: the local stack has no CAPTCHA,
and an empty key makes the app skip Turnstile. To see the widget at work, run
`pnpm dev` with Cloudflare's test key `1x00000000000000000000AA`, which always
passes.

### Run the app

Three terminals:

1. Supabase stack (already up after `supabase start`)
2. `pnpm edge` — serves all edge functions (hot-reload while editing)
3. `pnpm dev --host` — frontend (phone/emulator loads it via LAN IP,
   configured in `capacitor.config.ts`)

`VITE_SUPABASE_URL` in `.env.local` selects which backend the frontend
talks to. Edge functions always talk to the local database (see
[Edge functions](edge-functions.md#secrets)).

### Ports

| Service | URL                                                     |
| ------- | ------------------------------------------------------- |
| API     | http://127.0.0.1:54321                                  |
| Studio  | http://127.0.0.1:54323                                  |
| DB      | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit | http://127.0.0.1:54324                                  |

### Test accounts (seed)

There is one kind of account: it can post jobs and apply to other people's.
Both seeded accounts have the password `vaitu-local`, as do the accounts the
tests sign up.

- `giada@vaitu.local`, Giada Cazzola, posted the seeded jobs.
- `antony@vaitu.local`, Matteo Antony Mistretta, can apply to them right away.

### Migrations

⚠️ `db reset` deletes everything not in the seeds (`seed.sql`,
`seed-local.sql`). Production keeps its data, and it never re-runs a migration
it has applied, so a schema change takes one of two paths:

- **A big change**, or one that moves data, is a new file in
  `supabase/migrations/`, which `supabase db push` applies.
- **A small one**, like a constraint, can go in the initial migration to keep
  the history short, with the equivalent SQL run once on production (see
  [Deploying](deploying.md#small-schema-changes)).

A project with nothing worth keeping can instead change the initial migration
and reset from it (see [Deploying](deploying.md#starting-over)).

Older native builds keep running against the new schema until they are
updated, so a migration that removes or renames something they use needs the
care described in [Releasing updates](releasing-updates.md#backend-changes).

## Useful commands

```bash
pnpm test                     # every test
pnpm test:unit                # tests that need nothing running
pnpm test:integration         # tests against the local Supabase (*.integration.test.js)
pnpm edge:check               # type-check and lint the edge functions
pnpm typecheck                # wrong or unknown props on components, missing imports
pnpm security:scan            # ZAP scans of the app and the API (see Security)
supabase status               # URLs + keys
supabase db reset --yes       # wipe + migrate + reseed (deletes local rows!)
supabase migration up         # apply new migrations only
supabase stop                 # stop everything (data kept in volume)
```

Next: [Styling](styling.md).
