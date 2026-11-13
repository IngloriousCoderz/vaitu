# Releasing updates

Vaitu reaches users in two ways, and a new version travels differently to
each:

- **The web app and the installed PWA** update themselves. Deploying the
  frontend is the whole release.
- **The Android and iOS apps** carry their web code inside the binary, so a
  frontend deploy never reaches them. A signed live update replaces that code
  without the stores; only native changes, such as a new plugin or
  permission, go through the stores, where a minimum build number in the
  database decides when the update stops being optional.

Either way, users don't get to stay on an old version.

## Web and PWA: automatic

[Deploy the frontend](deploying.md#frontend). From there, the service worker
does the rest:

1. It checks for a new version every hour, and each time the app comes back
   to the foreground.
2. A new version downloads in the background while the old one keeps
   running.
3. It is applied, with a reload, at the first moment nobody is in the middle
   of something: at launch, or when the app goes to the background or comes
   back from it.
4. If it lands while someone is using the app, a pill offers "Update now".
   It can't be dismissed: if it's ignored, step 3 applies the update anyway.

Anything not yet saved when the app goes to the background, such as a
half-filled job form, is lost in that reload.

The rules live in `@inglorious/web/pwa` (`watchPwaUpdate`), wired in `src/pwa.js`; the pill is `src/common/update-bar/`. The check never runs
inside the native apps.

To try it locally, run `pnpm build && pnpm preview` and open the app. Then
change something, build again, and switch to another tab and back.

## Native apps: live updates

The web code inside the native apps updates like the PWA does, from a signed
bundle in the public `live-updates` bucket:

1. At launch, every hour and each time the app comes back to the foreground,
   it reads `manifest.json` from the bucket.
2. A bundle with a newer release, made for the installed build, downloads in
   the background. The app checks its signature against the public key built
   into it, and refuses one that doesn't match.
3. It is applied the next time the app goes to the background. Until then
   the "Update now" pill offers it.
4. A bundle that doesn't start within 10 seconds is rolled back to the code
   built into the app, and never downloaded again.

### Publishing one

`pnpm live:release` builds the committed code with the production `.env`,
from a clean checkout of `HEAD`, so uncommitted changes never ship. It signs
the zip with your private key and uploads it with the service role key, which
it asks the Supabase CLI for, as `pnpm vault:push` does. It is the
`inglorious-live-update` command from `@inglorious/supabase`, which
`build:release` and `live:keys` use too. The bucket keeps the new bundle and
the one before, for a device still downloading it; older ones are deleted, since
a bundle that fails rolls back to the code built into the app.

Every push to `main` does it, from `.husky/pre-push`, which reads git's refs
first:

```sh
#!/bin/sh
refs=$(cat)
pnpm typecheck
pnpm test:unit
printf '%s\n' "$refs" | pnpm exec inglorious-live-update release --on-push
```

It publishes only when the pushed commits touch the app: not for changes to
`landing/`, `docs/`, `supabase/`, `.changeset/`, `.github/` or Markdown alone. Without a key it skips,
and says so. `git push --no-verify` skips it on purpose.

### The signing key

Once, before the first store build that carries live updates, run
`pnpm live:keys`. It writes:

- the private key to `~/.config/vaitu/live-update.pem`, or wherever
  `LIVE_UPDATE_PRIVATE_KEY` points. Back it up somewhere safe, such as a
  password manager, and never commit it. Losing it means a new store build
  before the next live update.
- the public key to `live-update.pub.pem`. Commit it: `capacitor.config.ts`
  builds it into the apps.

Vercel never sees the private key, so a leaked Vercel account can change the
website but not the apps.

### Which builds take a bundle

Every release build is stamped with the moment it was built
(`VITE_LIVE_UPDATE_RELEASE`), and a bundle is taken only if it is newer.
A store build released after a bundle never goes back to it.

`liveUpdate.minBuild` in `package.json` is the oldest build a bundle can run
on. Raise it to the new build number whenever a release changes something
native, such as a Capacitor plugin, a permission or `capacitor.config.ts`: older
builds then keep their code until they update from the store. The first build
with live updates is 3.

Development builds (`pnpm mobile:ios`, `pnpm mobile:android`) carry no stamp,
so they never update themselves.

## Native apps: the stores, plus a minimum build

### Releasing a new build

The version users see comes from `package.json`, the same on the web, Android
and iOS (the About page shows it). The build number is shared by both native
apps: it must go up with every upload, and it is what the minimum is compared
against.

1. **Describe each change** as you make it with `pnpm changeset`. When a
   release is due, `pnpm release:version` raises the version in
   `package.json` from those notes and adds them to `CHANGELOG.md`, which is
   also the "What's New" text for the stores. Skip this step to upload another
   build of the same version, for example to TestFlight.
2. **Run `pnpm mobile:release`.** It copies the version into both native
   projects, raises the shared build number by one, then builds with the
   production backend and syncs. The backend is baked in at build time, so
   this build reads `.env` and ignores `.env.local`: every value it needs,
   including `VITE_TURNSTILE_SITE_KEY`, must be in `.env`. Commit what it
   changed.
3. **Upload and submit.** In Android Studio use **Build → Generate Signed
   App Bundle** and upload it to Google Play Console. In Xcode use
   **Product → Archive**, then **Distribute App → Custom → App Store
   Connect → Upload**, and untick **Manage Version and Build Number**, so
   the store gets the build number the project has.
4. **Wait** for review and for the release to go live.

At this point the update is optional: the stores offer it, and users take it
when their phone does.

### Making it mandatory

Every time the app opens, and every time it comes back to the foreground, it
reads its platform's row in the `app_versions` table:

| Column      | Meaning                                                 |
| ----------- | ------------------------------------------------------- |
| `platform`  | `ios` or `android`                                      |
| `min_build` | The oldest build number allowed to run                  |
| `store_url` | Where the "Update" button sends users (null: no button) |

A build below `min_build` shows a full-screen "Time to update" page with a
button to the store, and nothing else: no app bar, no tab bar, no way into
the rest of the app.

To make a release mandatory, raise `min_build` to its build number in the
cloud project, from the Table Editor or the SQL Editor:

```sql
update public.app_versions set min_build = 7 where platform = 'android';
```

⚠️ Do this **only once the new build is live in that platform's store**.
Before that, users get blocked with nothing to download. Raise each platform
on its own, since the two stores approve at different speeds.

No deploy is needed: the old installs already out there are the ones that
read the table. Signed-out users are blocked too, since the table is readable
before sign-in.

If the app can't reach Supabase (offline, a timeout), it keeps its last
answer. It never blocks someone because a check failed. It also means an
install that has only ever run offline isn't blocked until it gets a
connection.

The check is `@inglorious/web/native/update` with the `supabaseNativeUpdate` adapter, wired in `src/native-update.js`; the page is `src/common/update-required/`.

### Store links

`store_url` is in the table so it can be fixed without a release:

- Android: `https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu`
- iOS: `https://apps.apple.com/app/id6830630579`, the Apple ID from App
  Store Connect (App Information). With no link, the iOS page tells users to
  update from the App Store without a button.

### Trying it locally

1. Open Studio (http://127.0.0.1:54323), table `app_versions`.
2. Set `min_build` for your platform above the installed build, for example
   `99`.
3. Run `pnpm mobile:android` or `pnpm mobile:ios`. The update page appears.
4. Set it back to `1`.

## Backend changes

The backend has a single version, but installed native builds don't: every
build from `min_build` up is still out there talking to it. A migration or an
edge function change has to keep working for the oldest build still allowed
to run. Typical breaking changes:

- dropping or renaming a column or table that an older build reads or
  writes;
- tightening a constraint that an older build's writes don't meet;
- changing what an edge function accepts or returns.

Live updates shorten this: an app with a connection moves to the new code
within one trip to the background, as the web app does. But an install that
stays offline, or below `liveUpdate.minBuild`, keeps its old code.

When a change can't stay compatible, do it in two releases:

1. Ship a build that works with both the old and the new backend, and make
   it mandatory as described above.
2. Once `min_build` is raised, push the breaking migration or function.

The web app doesn't need this: it moves to the new version within one
foreground or background of each open session.

Next: [Security](security.md).
