# vaitu-fe

This project is a minimal starter template for creating an app with the Inglorious Web framework using plain JavaScript and Vite.

## Getting Started

This project was scaffolded with `@inglorious/create-app`.

To get started, follow these steps:

1.  **Install dependencies**:
    Navigate to your project directory and install the required packages.
    ```sh
    pnpm install
    ```
2.  **Start the development server**:
    Run the following command to start the Vite development server.
    ```sh
    pnpm dev
    ```

This will start a Vite development server. Open your browser to the local URL provided to see it in action.

## Project Setup

- `index.html`: The main entry point for your app.
- `src/`: Contains your app's JavaScript source code.
- `vite.config.js`: Vite configuration file.
- `package.json`: Project metadata and dependencies.

## Mobile Setup

This project includes Capacitor for Android and iOS support.

Please note that mobile development depends on external platform tooling that is not installed or managed by the CLI. If the app does not just work after scaffolding, it is usually because one or more native prerequisites are missing on the machine.

### Android

Before you run the native apps, make sure you have:

- Android Studio installed with the Android SDK: https://developer.android.com/studio
- A Java Development Kit compatible with Capacitor. Capacitor is currently known to work reliably with JDK 21, so prefer JDK 21 over newer versions if you run into Java compatibility errors.
- The SDK path available via ANDROID_HOME (for example, on macOS this is often $HOME/Library/Android/sdk)

On macOS, the following shell variables are commonly needed:

```bash
export JAVA_HOME="/path/to/jdk-21"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$PATH"
```

### iOS

For iOS you also need the Apple toolchain and device setup on a Mac:

- Xcode from the App Store
- iOS development tools and simulator components (this can be very large, often multiple GB)
- A valid Apple Developer team / signing identity in Xcode
- Device trust setup for your iPhone in Settings > General > VPN & Device Management

The most common first-time setup commands are:

```bash
sudo xcode-select -switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

If you are using a physical device, you may also need to approve the developer certificate on the device and ensure the app is signed with a valid team.

### Official resources

- Android: https://capacitorjs.com/docs/android
- iOS: https://capacitorjs.com/docs/ios
- Android Studio: https://developer.android.com/studio
- Xcode: https://developer.apple.com/xcode/

Then sync and open the native project:

```bash
pnpm mobile:sync
pnpm mobile:android
# or
pnpm mobile:ios
```
