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

After adding or upgrading a Capacitor plugin, run `pnpm mobile:sync` so the
native projects pick it up.

## Official resources

- Android: https://capacitorjs.com/docs/android
- iOS: https://capacitorjs.com/docs/ios
- Android Studio: https://developer.android.com/studio
- Xcode: https://developer.apple.com/xcode/

Next: [Deploying](deploying.md).
