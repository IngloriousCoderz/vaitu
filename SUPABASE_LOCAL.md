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

On a physical Android device, replace `127.0.0.1` with your computer
LAN IP (see Mobile section below) — the emulator uses `10.0.2.2` instead.

## Run the app

Three terminals:

1. Supabase stack (already up after `supabase start`)
2. `pnpm edge` — serves edge functions (`check-email`)
3. `pnpm dev --host` — frontend (phone/emulator loads it via LAN IP,
   configured in `capacitor.config.ts`)

## Ports

| Service | URL                                                     |
| ------- | ------------------------------------------------------- |
| API     | http://127.0.0.1:54321                                  |
| Studio  | http://127.0.0.1:54323                                  |
| DB      | postgresql://postgres:postgres@127.0.0.1:54322/postgres |
| Mailpit | http://127.0.0.1:54324                                  |

## Test accounts (seed)

- Sender: `sender@vaitu.local` / `test1234`
- Seeker: `seeker@vaitu.local` / `test1234` (profile pre-filled, can apply right away)

## Mobile (Capacitor)

No manual IP needed for dev. The app derives the Supabase host from the
page that serves it, and live reload auto-detects your LAN IP
(`CAP_SERVER_URL` overrides it for VPNs / multiple NICs).

```bash
# production install (uses bundled dist, no dev server needed)
pnpm mobile:android   # or pnpm mobile:ios

# live reload on a physical device (needs pnpm dev running, same Wi-Fi)
pnpm mobile:android:dev
# Windows (cmd): set CAP_LIVE=1 && pnpm mobile:android:dev
```

⚠️ `VITE_SUPABASE_URL` is baked into `dist` at **build time** — this only
matters for production installs, where the phone can't guess the server
address. Keep your computer LAN IP in `.env.local`, then rebuild.
Find it with `ipconfig getifaddr en0` (macOS),
`hostname -I | awk '{print $1}'` (Linux), `ipconfig` (Windows).

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

## Edge functions from a physical device

The app calls edge functions through Kong (`VITE_SUPABASE_URL` +
`/functions/v1/...`), so no extra setup is needed beyond a reachable
`VITE_SUPABASE_URL` — `supabase start` already serves `supabase/functions`.
If the app can't reach them, check in order:

1. Same Wi-Fi on computer and phone.
2. `.env.local` has **your** computer LAN IP, not `127.0.0.1` (unreachable
   from the phone) and not another dev's IP — then **rebuild**.
3. Quick check (proves LAN reachability) — same auto-derivation the
   app uses, so this rarely fails when 1–2 hold:
   ```bash
   # macOS / Linux (Windows: set $LAN_IP first, see Mobile section)
   LAN_IP=$(ipconfig getifaddr en0)  # macOS
   # LAN_IP=$(hostname -I | awk '{print $1}')  # Linux

   curl -X POST http://$LAN_IP:54321/functions/v1/check-email \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"email":"sender@vaitu.local"}'
   # expect: {"exists":true}
   ```
4. `pnpm edge` is only needed for hot-reload while editing a function.
