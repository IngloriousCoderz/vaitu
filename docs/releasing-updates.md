# Releasing updates

Vaitu reaches users in two ways, and a new version travels differently to
each:

- **The web app and the installed PWA** update themselves. Deploying the
  frontend is the whole release.
- **The Android and iOS apps** carry their web code inside the binary, so a
  frontend deploy never reaches them. They update through the stores, and a
  minimum build number in the database decides when the update stops being
  optional.

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
half-filled event form, is lost in that reload.

The code is in `src/pwa.js` and `src/common/update-bar/`. The check never runs
inside the native apps.

To try it locally, run `pnpm build && pnpm preview` and open the app. Then
change something, build again, and switch to another tab and back.

## Native apps: the stores, plus a minimum build

### Releasing a new build

1. **Raise the build number.** It must go up with every upload, and it is
   what the minimum is compared against (the version name is just for
   display):
   - Android: `versionCode` in `android/app/build.gradle` (and `versionName`
     for the version users see).
   - iOS: in Xcode, target **App** → **General** → **Identity**: **Build**
     (and **Version** for the version users see).
2. **Build with the production backend.** `.env.local` must point at the
   cloud project when you run `pnpm mobile:sync`, because the Supabase URL is
   baked in at build time (see [Mobile](mobile.md#running-the-native-apps)).
3. **Upload and submit.** In Android Studio use **Build → Generate Signed
   App Bundle** and upload it to Google Play Console. In Xcode use
   **Product → Archive** and upload it to App Store Connect.
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

The code is in `src/native-update.js` and `src/common/update-required/`.

### Store links

`store_url` is in the table so it can be fixed without a release:

- Android: `https://play.google.com/store/apps/details?id=it.ingloriouscoderz.vaitu`
- iOS: `https://apps.apple.com/app/id<ID>`, with the numeric id from App Store
  Connect. Until it's set, the iOS page tells users to update from the App
  Store without a button.

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

When a change can't stay compatible, do it in two releases:

1. Ship a build that works with both the old and the new backend, and make
   it mandatory as described above.
2. Once `min_build` is raised, push the breaking migration or function.

The web app doesn't need this: it moves to the new version within one
foreground or background of each open session.
