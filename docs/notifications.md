# Notifications

When something happens that a user should hear about, the database writes a
row in `notifications` for them: an application to their event, a decision on
their application, a change to an event they applied to. Triggers write these
rows (the notifications section of `supabase/migrations/20261028120000_initial_schema.sql`), so no client
can make one up, and a row is all the app needs to tell the user in two ways:

- **The bell** in the app shows the newest rows and counts the unread ones,
  live while the app is open.
- **A push** reaches a browser or a phone where the user allowed
  notifications, even with the app closed.

The bell needs nothing but the row. Pushes go through Firebase Cloud
Messaging (FCM), one service for the PWA, Android and iOS alike.

## The bell

`src/common/notifications/` loads the feed at sign-in and listens for new rows
over Supabase Realtime. A tap on a row marks it read and opens what it is
about (`pathFor`).

## Pushes

### Asking

A device shows its permission dialog only so many times: refused there, the
app may never ask again. So the first sign-in on a device shows a pill
instead, and the dialog only comes up after "Notify me". "Not now" hides the
pill on that device for good; notifications can still be allowed later from
the browser's or the phone's own settings. The pill is
`src/common/push-prompt/`, the same in the PWA and the native apps.

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
2. If its recipient has a token, a trigger calls the `push-notify`
   [edge function](edge-functions.md) with the row's id.
3. `push-notify` marks the row as pushed, so it is never sent twice, writes
   the message in the recipient's language, and sends it through FCM to each
   of their devices (`fcm.ts`). A token FCM no longer knows is deleted.
4. In a browser, the service worker (`public/sw-push.js`) shows it: browsers
   get the message as data only, so the app decides how it looks. The native
   apps get a notification the system shows by itself. Either way a tap opens
   the same screen as the row in the bell; in the native apps `onPushTap`
   hears it.

While the native app is open, Android shows no notification: the bell already
has the row.

The edge function can't import app code, so it keeps copies of the feed's
lines (`wording.json`) and destinations (`message.ts`).
`src/common/notifications/push.test.js` fails when they drift from the
catalogues or from `pathFor`. After changing a line in
`notifications.types`, copy it into `wording.json`.

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
`pnpm build && pnpm preview`. Sign in as `sender@vaitu.local`, allow
notifications and close the tab. Then, as `seeker@vaitu.local` in another
browser, apply to one of the sender's events. On Android, sign in as the
sender with `pnpm mobile:android`, allow notifications and leave the app.

Next: [Mobile](mobile.md).
