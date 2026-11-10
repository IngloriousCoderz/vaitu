# Notifications

When something happens that a user should hear about, the database writes a
row in `notifications` for them: a new job for their trades and regions, an
application to their job, a decision on their application, a change to a
job they applied to, a job waiting for their report. Triggers write these
rows (the notifications section of `supabase/migrations/20261028120000_initial_schema.sql`), so no client
can make one up, and a row is all the app needs to tell the user in three ways:

- **The bell** in the app shows the newest rows and counts the unread ones,
  live while the app is open.
- **A push** reaches a browser or a phone where the user allowed
  notifications, even with the app closed.
- **An email** reaches everyone else: on an iPhone, a website can only send
  pushes once it's installed on the Home Screen, which most people never do.

The bell needs nothing but the row. Pushes go through Firebase Cloud
Messaging (FCM), one service for the PWA, Android and iOS alike. Emails go
through Resend.

## Choosing

Preferences has an email and a push checkbox for each type of notification, plus
one for everything. `profiles.muted_email_types` and `muted_push_types` hold what
is off, and `all` in a list turns the channel off, new types included.
`src/data/notification-types.js` groups the types for that screen, so a new type
goes there and in `preferences.notifications.types` in every locale. The bell
always shows the row.

## The bell

`src/common/notifications/` loads the feed at sign-in, and again whenever the
`notifications` table changes, like every live screen: `src/store/index.js`
lists which tables each one reads, and `src/api/live.js` wires them to
Supabase Realtime. A tap on a row marks it read and opens what it is about
(`pathFor`).

A notification only points to a job or an application, which keep their own
state, so old ones go: `purge_old_rows()` runs nightly on `pg_cron` and deletes
read notifications after 30 days and any after 90. It also clears expired
erasure links and keeps a week of `pg_cron`'s own log.

## Pushes

### Asking

A device shows its permission dialog only so many times: refused there, the
app may never ask again. So the first sign-in on a device shows a pill
instead, and the dialog only comes up after "Notify me". "Not now" hides the
pill on that device for good; notifications can still be allowed later from
the browser's or the phone's own settings. The pill is
`src/common/push-prompt/`, the same in the PWA and the native apps: the
`createPushPrompt` type from `@inglorious/web/push`, over the FCM adapter
`push` in `src/api/push.js`.

### Which device gets whose pushes

Once notifications are allowed, every sign-in gets the device's FCM token and
saves it in `push_tokens` under the user who signed in, with its platform
(`web`, `android` or `ios`). Signing out deletes it. A device belongs to one
user at a time: if a sign-out could not reach the server, the next person to
sign in there takes the token over. The client side is `src/api/push.js`,
which wraps `@capacitor-firebase/messaging`; `endSession` in
`src/api/session.js` does the deleting.

### Sending

1. A row lands in `notifications`.
2. If its recipient has a token and hasn't muted the type, a trigger calls the `push-notify`
   [edge function](edge-functions.md) with the row's id.
3. `push-notify` marks the row as pushed, so it is never sent twice, writes
   the message in the recipient's language, and sends it through FCM to each
   of their devices (`fcm.ts`). A token FCM no longer knows is deleted.
4. In a browser, the service worker (`public/sw-push.js`) shows it: browsers
   get the message as data only, so the app decides how it looks. The native
   apps get a notification the system shows by itself. Either way a tap opens
   the same screen as the row in the bell; in the native apps the adapter's
   `onTap` hears it, and the pill's type navigates there.

While the native app is open, Android shows no notification: the bell already
has the row.

The edge function can't import app code, so it keeps copies of the feed's
lines (`_shared/notification-wording.json`) and destinations
(`_shared/notification-message.ts`).
`src/common/notifications/push.test.js` fails when they drift from the
catalogues or from `pathFor`. After changing a line in
`notifications.types`, copy it into `notification-wording.json`.

## Emails

Every five minutes, if any row hasn't been handled, `pg_cron` calls the
`send-emails` [edge function](edge-functions.md):

1. It drops the rows nobody needs an email about: already read in the bell,
   muted, or over three days old.
2. It groups the rest by person, so several updates share one email. New jobs
   wait for the morning digest, at 7:00 UTC.
3. It marks the rows in `emailed_at`, so they are never sent twice, and sends
   everything in one Resend batch. If that fails, the rows go back to waiting.

The wording is the feed's lines (`_shared/notification-wording.json`), in the
recipient's language, with `send-emails/wording.json` around them.
`src/common/notifications/email.test.js` fails when that file drifts from
`notifications.email` in the catalogues.

### The daily limit

Resend's free plan allows 100 emails a day and 3,000 a month, and signup
confirmations share them if Supabase Auth sends through Resend. So `send-emails`
stops at 80 a day (`DAILY_BUDGET`, counted in `email_budget`), with people waiting
on something other than new jobs first. The rest wait for the next day, and
`ALERT_EMAIL` hears about it once a day. Past about 80 people with a new job
every morning, the plan needs upgrading or the digests will arrive late.

### Unsubscribing

Each email links to `/unsubscribe`, which works signed out with the token from
`email_tokens`, and needs a button press, because mail scanners follow links. The
`List-Unsubscribe` headers also give mail apps their own button, which calls
`email-unsubscribe` directly. That function runs without a key
(`verify_jwt = false` in `supabase/config.toml`), so a token can only ever turn
emails off.

## New job alerts

A new job notifies whoever chose its profession in Preferences, if its job
type and region suit theirs too (an empty list of either means any). An empty
list of professions gets no alerts: in the feed it means "show me everything",
which is not a wish for an email per job. Muting `new_job` on both channels
stops the row too, so the bell stays quiet as well. Regions are compared as
stored, which works because `normalizeJob` writes the canonical name, the one
favorites use.

## Setting up Firebase

Everything lives in the Firebase project `inglorious-vaitu`, which has a web,
an Android and an iOS app registered under `it.ingloriouscoderz.vaitu`.

### The server

`push-notify` sends as a service account. In the Firebase console, Project
settings → Service accounts → Generate new private key downloads a JSON file.
It is a real secret: never commit it. Its account needs the **Firebase Cloud
Messaging API Admin** role (Google Cloud console → IAM), or every send fails
with `IAM_PERMISSION_DENIED`.

Put the file's JSON, on one line, in `supabase/functions/.env`:

```bash
FCM_SERVICE_ACCOUNT={"type":"service_account","project_id":"inglorious-vaitu",...}
```

Production gets the same value as a secret, as described in
[Deploying](deploying.md).

### The browser

The PWA needs the web app's config (Project settings → General → your web
app) and the public half of its Web Push key pair (Project settings → Cloud
Messaging → Web configuration). Firebase keeps the private half. None of
these are secret, since they end up in the built app. Put them in
`.env.local`:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_PROJECT_ID=inglorious-vaitu
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=<public key of the Web Push pair>
```

### The native apps

They read the project from `android/app/google-services.json` and
`ios/App/GoogleService-Info.plist`, downloaded from each app's settings
in the Firebase console. The plist must also be part of the App target in
Xcode, or it is not bundled.

iOS also needs, once the Apple Developer account is active:

- the Push Notifications capability, plus Background Modes → Remote
  notifications, on the App target;
- an APNs key (`.p8`) from the Apple Developer site, uploaded under Project
  settings → Cloud Messaging → Apple app configuration.

## Trying it locally

`supabase/seed-local.sql` already gives the trigger the local function URL and key.

In a browser the service worker only exists in a build, so try it with
`pnpm build && pnpm preview`. Sign in as `giada@vaitu.local`, allow
notifications and close the tab. Then, as `antony@vaitu.local` in another
browser, apply to one of Giada's jobs. On Android, sign in as Giada with
`pnpm mobile:android`, allow notifications and leave the app.

Next: [Reputation](reputation.md).
