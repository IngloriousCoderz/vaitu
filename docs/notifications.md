# Notifications Architecture

Vaitu's notification system has three layers, each opt-in and independent.

## Layer 1 — In-App Bell (done)

- Entity: `Notifications` in `src/common/notifications/index.js`
- Realtime feed via Supabase Realtime on `notifications` table
- Unread badge on the tab bar bell; tablet+ opens a right-side drawer
- Optimistic mark-read; session-bound channel (rebinds on sign-in)

## Layer 2 — Web Push (this feature)

- **Entity**: `PushPrompt` in `src/common/push-prompt/index.js`
- **Permission UI**: `PushPromptBar` snackbar (twin of `UpdateBar`)
- **Subscription**: `push_subscriptions` table (one row per user+browser)
- **Edge function**: `push-notify` (self-contained, no app imports)
- **Service worker**: `public/sw-push.js` (imported by Workbox SW)
- **Wake chain**: DB trigger `vaitu_wake_push` → `pg_net.http_post` → Kong → `push-notify`
- **CAS claim**: `pushed_at` IS NULL → NOW() ensures exactly-once per row
- **Dead-endpoint sweep**: 404/410 responses delete the subscription row
- **Decline persists**: `localStorage.vaitu-push-declined` survives sessions
- **Silent resync**: `sessionStart` re-registers endpoint when permission=granted
- **Native gate**: `isNative()` returns early — Layer 3 (FCM/APNs) is separate

### Files

| Path                                                        | Role                                                                        |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/common/push-prompt/index.js`                           | Entity (`create`, `sessionStart`, `ask`, `settle`, `decline`, `sessionEnd`) |
| `src/common/push-prompt/template.js`                        | `PushPromptBar` renderer (snackbar pill)                                    |
| `src/common/push-prompt/style.module.css`                   | Pill geometry (drawer-aware, wraps, stacks)                                 |
| `src/common/notifications/push-copy.js`                     | Pure composition: `pathFor`, `pushParamsFor`, `pushFor`                     |
| `src/api/push.js`                                           | `subscribeToPush`, `forgetCurrentPush`                                      |
| `supabase/functions/push-notify/index.ts`                   | Edge function (self-contained copy of composition)                          |
| `supabase/migrations/20261026000001_push_subscriptions.sql` | Table + RLS + `pushed_at` + wake trigger                                    |
| `public/sw-push.js`                                         | Classic SW handlers (`push`, `notificationclick`)                           |
| `vite.config.js`                                            | `workbox.importScripts: ["sw-push.js"]`                                     |

### Styling Law (Matteo)

- `--vdrawer-stripe` published by `src/app/style.module.css` as **inherited CSS var** at `≥64rem`
- Values: `16rem` (open), `4rem` (collapsed), `0rem` (hidden)
- Both `UpdateBar` and `PushPromptBar` consume via `var(--vdrawer-stripe, 0rem)`
- **Never in `tokens.css`** — that file was reduced by 66 lines for this reason

### Stacking

- `isStacked = Boolean(pwaUpdate?.isUpdateReady)` only
- `UpdateBar` non-dismissable (Matteo's rewrite removed `isDismissed`/`isDialogOpen`/`defer`)
- Both pills use `@inglorious/ui` `Snackbar`; stacked push bumps `bottom` by `--iw-space-16`

## Layer 3 — Native Push (FCM/APNs via Capacitor) — next card

- Requires Capacitor Push Notifications plugin
- Separate entity, separate permission flow
- Shares `push-copy.js` composition for wording parity

## Manual Test Roteiro

1. Two accounts (A = event owner, B = applicant) on two devices/browsers
2. B applies → A sees toast (app open) + push (app closed)
3. A selects → B sees toast + push
4. A rejects → B sees toast + push
5. Sign out B → endpoint row deleted; sign in B → silent resync
6. "Not now" on B → pill never returns; browser settings can still grant
7. Check `pushed_at` timestamp on notifications row after each push
