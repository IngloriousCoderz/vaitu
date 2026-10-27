# Notifications

When something happens that a user should hear about, the database writes a
row in `notifications` for them: an application to their event, a decision on
their application, a change to an event they applied to. Triggers write these
rows (`supabase/migrations/20261023000000_notifications.sql`), so no client
can make one up, and a row is all the app needs to tell the user in two ways:

- **The bell** in the app shows the newest rows and counts the unread ones,
  live while the app is open.
- **A push** reaches a browser where the user allowed notifications, even
  with the app closed.

The Android and iOS apps don't get pushes yet: they need Firebase and APNs,
which Web Push doesn't cover.

## The bell

`src/common/notifications/` loads the feed at sign-in and listens for new rows
over Supabase Realtime. A tap on a row marks it read and opens what it is
about (`pathFor`).

## Web Push

### Asking

Browsers show their permission dialog once: refused there, the app can never
ask again. So the first sign-in on a browser shows a pill instead, and the
dialog only comes up after "Notify me". "Not now" hides the pill on that
browser for good; notifications can still be allowed later from the browser's
own settings. The pill is `src/common/push-prompt/`.

### Which browser gets whose pushes

Once notifications are allowed, every sign-in saves the browser's push
subscription under the user who signed in, and signing out deletes it. A
browser belongs to one user at a time: if a sign-out could not reach the
server, the next person to sign in there takes the browser over. The client
side is `src/api/push.js`; `endSession` in `src/api/session.js` does the
deleting.

### Sending

1. A row lands in `notifications`.
2. If its recipient has a subscription, a trigger calls the `push-notify`
   [edge function](edge-functions.md) with the row's id.
3. `push-notify` marks the row as pushed, so it is never sent twice, writes
   the message in the recipient's language, and sends it to each of their
   browsers. A browser the push service reports as gone is deleted.
4. The service worker (`public/sw-push.js`) shows it. A tap opens the same
   screen as the row in the bell.

The edge function can't import app code, so it keeps copies of the feed's
lines (`wording.json`) and destinations (`message.ts`).
`src/common/notifications/push.test.js` fails when they drift from the
catalogues or from `pathFor`. After changing a line in
`notifications.types`, copy it into `wording.json`.

## Setting up Web Push locally

Pushes are signed with a VAPID key pair. Generate one:

```bash
npx web-push generate-vapid-keys
```

Put both halves in `supabase/functions/.env`, plus a contact for the push
services:

```bash
VAPID_PUBLIC_KEY=<public key>
VAPID_PRIVATE_KEY=<private key>
VAPID_SUBJECT=mailto:<your email>
```

The public key also goes in `.env.local`, for the browser:

```bash
VITE_VAPID_PUBLIC_KEY=<public key>
```

`supabase/seed.sql` already gives the trigger the local function URL and key.

The service worker only exists in a build, so try it with
`pnpm build && pnpm preview`. Sign in as `sender@vaitu.local`, allow
notifications and close the tab. Then, as `seeker@vaitu.local` in another
browser, apply to one of the sender's events.

Production needs the same keys, set as described in
[Deploying](deploying.md).

Next: [Mobile](mobile.md).
