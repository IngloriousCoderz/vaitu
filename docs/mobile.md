# Mobile (Capacitor)

The Android and iOS apps are Capacitor shells around the same web code. A
production install carries a copy of the built `dist/` inside the binary, which
is why it only changes through the stores (see
[Releasing updates](releasing-updates.md)).

Mobile development depends on external platform tooling that pnpm does not
install. If the app does not just work, it is usually because one or more
native prerequisites are missing on the machine.

## Android prerequisites

- [Android Studio](https://developer.android.com/studio) installed with the Android SDK
- A Java Development Kit compatible with Capacitor. Capacitor is currently known to work reliably with JDK 21, so prefer JDK 21 over newer versions if you run into Java compatibility errors.
- The SDK path available via `ANDROID_HOME` (for example, on macOS this is often `$HOME/Library/Android/sdk`)

On macOS, the following shell variables are commonly needed:

```bash
export JAVA_HOME="/path/to/jdk-21"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

## iOS prerequisites

For iOS you also need the Apple toolchain and device setup on a Mac:

- [Xcode](https://developer.apple.com/xcode/) from the App Store
- iOS development tools and simulator components (this can be very large, often multiple GB)
- A valid Apple Developer team / signing identity in Xcode
- Device trust setup for your iPhone in Settings > General > VPN & Device Management

The most common first-time setup commands are:

```bash
sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

If you are using a physical device, you may also need to approve the developer certificate on the device and ensure the app is signed with a valid team.

## Running the native apps

Sync and open the native project:

```bash
pnpm mobile:sync
pnpm mobile:android
# or
pnpm mobile:ios
```

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

Pushes need the Firebase files `google-services.json` and
`GoogleService-Info.plist` in the project root (see
[Notifications](notifications.md#the-native-apps)). Without the first, the
Android build still succeeds but logs that it skipped the google-services
plugin, and the app gets no pushes.

After adding or upgrading a Capacitor plugin, run `pnpm mobile:sync` so the
native projects pick it up.

## Native settings

Don't edit `android/` and `ios/` by hand for what the `native` key in
`package.json` covers: after every `cap sync`, `inglorious-capacitor configure`
applies it. It sets the signing team, links that open the app, push, Analytics
off until consent, permissions, Info.plist entries, iOS swipe back, the iOS
privacy manifest, and copies the Firebase files from the project root.
`NSCameraUsageDescription` is there because the photo buttons offer the camera
on iOS, which closes an app that has no such description. See the
[`@inglorious/capacitor` README](https://www.npmjs.com/package/@inglorious/capacitor).

What outlives a visit is kept outside the WebView's localStorage, which iOS and
Android can clear when space runs low (`src/api/storage.js`). The Supabase
session's tokens go in the Keychain (iOS) or Keystore (Android), through
`@capgo/capacitor-native-biometric`; the signed-in user, analytics consent and a
declined push prompt go in Capacitor Preferences. On iOS the Keychain survives
uninstalling the app, so a reinstall comes back signed in while the server still
accepts the session. Preferences answers asynchronously, so the app
mounts once the session is back (`sessionRestored` in `src/common/session`).
Started offline, the stored session stands until the server can check it.

Icons and splash screens come from `public/logo.svg`, on the colours of
`native.assets`: run `pnpm mobile:assets` after changing either.

## Store listing images

`pnpm mobile:listing-assets` makes every image the store listings need into
`listing-assets/`: screenshots for iPhone, Android phones and tablets, in
English and Italian, then the feature graphic, header and search results card,
and Play's 512px icon. The screens, the demo sign-in and the promo text are in
`listing.config.js`.

It runs against the local stack with the showcase data (`sara@showcase.local`
and her colleagues), never production. Start the app on port 5200 first
(`pnpm dev --port 5200`). The config refers to the showcase jobs by id, so
update the ids after recreating that data.

## Links that open the app

A link to `app.vaitu.net`, from an email or a chat, opens the installed app
instead of the browser, and the router goes to the link's path
(`src/app-links.js`). Sign-up confirmations (`/confirm`) open the app too.
Unsubscribe links stay in the browser, where they work without the app.

`native.appLinks` lists the paths that open the app and the ones that stay
in the browser; `configure` writes both platforms' settings from it.

- **iOS** reads `public/.well-known/apple-app-site-association`, built from
  `native.ios.teamId`.
- **Android** reads `public/.well-known/assetlinks.json`, built from
  `native.android.sha256`: the fingerprints of Google's app signing key and
  your upload key, both under Test and release → App integrity → App signing
  in Play Console. Android can't exclude paths, so it opens only the listed
  ones.

Both files are cached: a change can take a while to reach the phones, and
Android verifies the domain when the app is installed or updated. To check
Android: `adb shell pm get-app-links it.ingloriouscoderz.vaitu` should say
`verified` for `app.vaitu.net`.

## Official resources

- Android: https://capacitorjs.com/docs/android
- iOS: https://capacitorjs.com/docs/ios
- Android Studio: https://developer.android.com/studio
- Xcode: https://developer.apple.com/xcode/

Next: [Deploying](deploying.md).
