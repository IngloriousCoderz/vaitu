# Supabase Local Setup

> Local data lives in Docker volumes on your machine — it never touches
> Supabase Cloud. The cloud project (`utzdcnnjxulwlsuhzjaq`) is deployed
> separately — see **Deploying to the cloud** below.

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
2. `pnpm edge` — serves all three edge functions (hot-reload while editing)
3. `pnpm dev --host` — frontend (phone/emulator loads it via LAN IP,
   configured in `capacitor.config.ts`)

⚠️ `supabase/functions/.env` holds the AI provider keys and also a
`SUPABASE_URL`. Keep that URL on `http://127.0.0.1:54321` while working
locally — pointing it at the cloud project makes `pnpm edge` write to
production. `VITE_SUPABASE_URL` in `.env.local` selects which backend the
frontend talks to.

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

## Voice AI (transcription + field parsing)

Two external providers, currently on personal test keys. Both keys go in
`supabase/functions/.env` (NOT `.env.local` — that one is only for the
frontend). The file is gitignored, never committed, and functions
hot-reload it — no restart needed:

```
DEEPGRAM_API_KEY=<from console.deepgram.com → Project → API Keys>
OPENROUTER_API_KEY=<from openrouter.ai → Keys>
```

| Step                      | Provider   | Function           | Model                                    |
| ------------------------- | ---------- | ------------------ | ---------------------------------------- |
| Speech-to-text (Italian)  | Deepgram   | `transcribe-audio` | `nova-3` (`language=it`)                 |
| Transcript → event fields | OpenRouter | `parse-event`      | `nvidia/nemotron-3-super-120b-a12b:free` |

Troubleshooting:

- `500 "DEEPGRAM_API_KEY is not set"` → key in the wrong `.env`. The
  functions also need `SUPABASE_URL` / `SUPABASE_ANON_KEY` /
  `SUPABASE_SERVICE_ROLE_KEY` in the same file.
  (With a full `supabase start` these are auto-injected; with only
  `pnpm edge` running, the file is the only source.)
- `401 INVALID_AUTH from Deepgram` → the key itself is bad: regenerate
  it in the Deepgram console (copy the full value, no spaces, no quotes)
  and replace it.
- Free OpenRouter models rotate and rate-limit (`429` = swap `MODEL` in
  `parse-event/index.ts` for another `:free` one from
  `openrouter.ai/api/v1/models`).
- Audio stays in the `event-audio` bucket (one file per event, replaced
  or deleted with the event); only the transcript fills the form.
- Local Whisper was evaluated and dropped: worse on Italian proper nouns
  plus a ~150MB model download per device.

## Deploying to the cloud

The local stack is Docker-only and never reaches the internet. Production is
Supabase Cloud, project ref `utzdcnnjxulwlsuhzjaq` (`eu-central-1`), and the
deployable units are the SQL migrations plus the three edge functions — there
is no backend server process to containerize.

```bash
supabase login
supabase link --project-ref utzdcnnjxulwlsuhzjaq
supabase db push                                        # apply migrations
supabase secrets set \
  DEEPGRAM_API_KEY=... OPENROUTER_API_KEY=...           # third-party keys
supabase functions deploy check-email transcribe-audio parse-event
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

- **Site URL** → `https://vaitu.netlify.app` (currently still localhost)
- **Redirect URLs** → add `https://vaitu.netlify.app/**`

Neither affects CORS. Site URL only decides where email-confirmation links
point; CORS on the REST and Auth gateways is open by default and echoes the
request origin, which the preflight checks confirm is working.

### Frontend deploy

`VITE_SUPABASE_URL` is inlined into `dist/` at build time, so Netlify needs it
as a build-time env var — the gitignored `.env` is not available there.

```bash
# Netlify: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY set in the UI
pnpm build          # emits dist/
```

Two traps worth knowing:

- `src/api/client.js` rewrites the URL to `http://<page-host>:54321` when the
  baked URL is localhost/127.0.0.1 and the page is served from a real host. It
  cannot fire when the cloud URL is baked in, but a Netlify build missing
  `VITE_SUPABASE_URL` will silently point every request at
  `https://vaitu.netlify.app:54321` and look exactly like a CORS failure.
- `dist/` is gitignored, so CI must run the build itself.
