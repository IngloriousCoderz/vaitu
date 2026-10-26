# Edge functions

Server-side code that needs the service role or a third-party key lives in
`supabase/functions/`, one folder per function. They run on Deno, not Node.

| Function             | Called from                                         | Caller                | Does                                                                                                 |
| -------------------- | --------------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------- |
| `check-email`        | Login/signup routing                                | Anyone (rate-limited) | Says whether an account exists for an email                                                          |
| `deactivate-account` | Profile → deactivate                                | Logged-in user        | Deactivates the caller, drops their applications/open events                                         |
| `transcribe-audio`   | Event form, voice input                             | Logged-in user        | Speech-to-text of the caller's upload ([Voice AI](voice-ai.md))                                      |
| `parse-event`        | Event form, voice input                             | Logged-in user        | Transcript → event fields ([Voice AI](voice-ai.md))                                                  |
| `push-notify`        | DB trigger `vaitu_wake_push` via `pg_net.http_post` | — (woken by DB)       | Assembles & sends Web Push for a new notification row; CAS claim on `pushed_at`; dead-endpoint sweep |

### Database-woken functions

`push-notify` is not invoked via `supabase.functions.invoke()`. Instead:

1. A row lands in `notifications` (realtime already nudge the in-app bell).
2. An `AFTER INSERT` trigger `vaitu_wake_push` fires and calls `net.http_post` against `{project_url}/functions/v1/push-notify` with the row's `id`.
3. The function runs, does a `SELECT ... UPDATE ... SET pushed_at = NOW() WHERE pushed_at IS NULL` (CAS claim), assembles the toast from the row's joins, sends via `web-push`, sweeps 404/410 endpoints.

This keeps the app's client out of the delivery path — no retry logic, no VAPID private keys in the browser, no race with the user closing the tab.

The trigger reads `project_url` and `service_role_key` from Vault (never from the migration). Local `supabase/seed.sql` fills the demo Kong URL and service-role JWT; on cloud, set them once in the SQL editor:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<SERVICE_ROLE_KEY>', 'service_role_key');
```

Missing secrets skip the wake — Layer 1 still writes the feed row.

```
supabase/functions/
├── .env                 # third-party keys, gitignored
├── deno.json            # keeps Deno off the app's node_modules; lint config
├── _shared/
│   ├── http.ts          # CORS, json(), serve(), upstreamError(), STATUS_CODE
│   └── supabase.ts      # env(), admin() service-role client, currentUser()
└── <name>/index.ts      # one per function
```

Folders starting with `_` are never deployed as functions.

## Editor setup

1. `brew install deno`
2. Install the recommended VS Code extension `denoland.vscode-deno`
   (VS Code offers it on opening the repo) and reload the window.

`.vscode/settings.json` turns Deno on for `supabase/functions` only; the
rest of the repo keeps the normal TypeScript/ESLint setup. Without the
extension VS Code reports false errors such as `Cannot find name 'Deno'`.

## Secrets

Third-party keys go in `supabase/functions/.env` (see
[Voice AI](voice-ai.md) for the values). The functions hot-reload it.

Don't put `SUPABASE_*` variables there: the CLI injects `SUPABASE_URL`,
`SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` of the local stack
itself and skips those lines with an `Env name cannot start with
SUPABASE_` warning. Local functions therefore always talk to the local
database. In production the platform injects them the same way.

## Run, check, test

```bash
pnpm edge                     # serve with hot reload and logs in the terminal
pnpm edge:check               # deno check + deno lint (needs Deno installed)
pnpm test:integration         # includes the *.integration.test.js that call them
```

`supabase start` already serves the functions, so `pnpm edge` is only needed
while editing one or to read its logs. The integration tests need the local
stack running.

## Adding a function

1. Create `supabase/functions/<name>/index.ts` from this skeleton. Don't use
   `supabase functions new`: it adds a per-function `deno.json` that replaces
   the shared one.

   ```ts
   import "jsr:@supabase/functions-js@2/edge-runtime.d.ts"
   import { json, serve, STATUS_CODE } from "../_shared/http.ts"
   import { currentUser } from "../_shared/supabase.ts"

   serve(async (req) => {
     const user = await currentUser(req)
     if (!user)
       return json({ error: "Not logged in" }, STATUS_CODE.Unauthorized)

     return json({ ok: true })
   }, "<name> failed")

   // support functions below the handler
   ```

   Lay it out like the others: imports, constants, the `serve()` handler,
   then the `function` declarations it uses. Status codes come from
   `STATUS_CODE`, other numbers get a named constant.

2. Call it from the app with `supabase.functions.invoke("<name>", { body })`.
3. Cover it with a `*.integration.test.js` next to its caller.
4. Add it to the table above and deploy it (see [Deploying](deploying.md)).

Changing what an existing function accepts or returns is a breaking change
for native builds already installed: see
[Releasing updates](releasing-updates.md#backend-changes).

## From a physical device

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
   # macOS / Linux (Windows: set $LAN_IP first, see Mobile)
   LAN_IP=$(ipconfig getifaddr en0)  # macOS
   # LAN_IP=$(hostname -I | awk '{print $1}')  # Linux

   curl -X POST http://$LAN_IP:54321/functions/v1/check-email \
     -H "apikey: $VITE_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
     -d '{"email":"sender@vaitu.local"}'
   # expect: {"exists":true}
   ```

Next: [Voice AI](voice-ai.md).
