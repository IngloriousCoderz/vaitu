# Supabase Local Setup

> Local data lives in Docker volumes on your machine — it never touches
> Supabase Cloud. That's why the cloud dashboard looks empty: there is no
> cloud project yet. Everything below runs offline.

## Prerequisites

- Docker Desktop running
- Supabase CLI: `brew install supabase/tap/supabase`
- `pnpm install` (project dependencies)

## Start

```bash
supabase start        # first run pulls images, takes a few minutes
supabase db reset --yes   # applies migrations + seed (sender + 8 events)
```

## Frontend env

Copy from `supabase status` (API URL + Publishable key) into `.env.local`
(not committed):

```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<publishable key from status>
```

On a physical Android device, replace `127.0.0.1` with your Mac LAN IP
(`ipconfig getifaddr en0`) — the emulator uses `10.0.2.2` instead.

## Run the app

Three terminals:

1. Supabase stack (already up after `supabase start`)
2. `pnpm edge` — serves edge functions (`check-email`)
3. `pnpm dev --host` — frontend (phone/emulator loads it via LAN IP,
   configured in `capacitor.config.ts`)

## Ports

| Service | URL                        |
| ------- | -------------------------- |
| API     | http://127.0.0.1:54321     |
| Studio  | http://127.0.0.1:54323     |
| DB      | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit | http://127.0.0.1:54324     |

## Test accounts (seed)

- Sender: `sender@vaitu.local` / `test1234`

## Useful commands

```bash
supabase status               # URLs + keys
supabase db reset --yes       # wipe + migrate + reseed (deletes local rows!)
supabase migration up         # apply new migrations only
supabase stop                 # stop everything (data kept in volume)
```

⚠️ `db reset` deletes everything not in `seed.sql`. Migrations are
append-only history — never edit an applied one, always add a new file in
`supabase/migrations/`.
