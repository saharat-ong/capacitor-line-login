# @saharat-ong/capacitor-line-login

Capacitor **8** plugin for **app-to-app LINE Login** on **iOS** and **Android**. When the LINE app is installed, authentication opens in LINE; otherwise the LINE SDK falls back to its own web login.

The JavaScript side only receives tokens (`idToken`, `accessToken`) and should pass them to your backend. **Never put the channel secret in the app.** The channel ID is public and should come from your backend at runtime.

> This package is currently `private: true` and is **not** published to npm. Consume it via git / local path until you choose to publish.

## Platforms

| Platform | Native SDK | Notes |
|----------|------------|--------|
| iOS 15+ | [LINE SDK for iOS Swift](https://github.com/line/line-sdk-ios-swift) (`LineSDKSwift` ~> 5.11) | Swift **6** language mode |
| Android (minSdk 24+) | [LINE SDK for Android](https://github.com/line/line-sdk-android) (`com.linecorp.linesdk:linesdk`) | Java Capacitor plugin |
| Web | Stub only | Throws `UNAVAILABLE` |

## Install

Until published:

```bash
# git (example)
npm install github:saharat-ong/capacitor-line-login#main

# or local path / file:
npm install file:../capacitor-line-login
```

Then sync native projects:

```bash
npx cap sync
```

Peer dependency: `@capacitor/core` **^8.0.0**.

CocoaPods pulls `LineSDKSwift` via this plugin’s podspec (`SaharatOngCapacitorLineLogin`). Android depends on `com.linecorp.linesdk:linesdk` from the plugin’s `android/build.gradle`.

## API

```ts
import { LineLogin } from '@saharat-ong/capacitor-line-login';

await LineLogin.setup({ channelId: 'YOUR_CHANNEL_ID' });

const { idToken, accessToken } = await LineLogin.login({
  nonce: serverIssuedNonce,
  // optional; default:
  // scopes: ['profile', 'openid', 'email'],
});

const { available } = await LineLogin.isAvailable();
```

### Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `setup({ channelId })` | `Promise<void>` | Initialize the LINE SDK. Call once before `login`. |
| `login({ nonce, scopes? })` | `Promise<{ idToken: string; accessToken: string }>` | Start login. |
| `isAvailable()` | `Promise<{ available: boolean }>` | Native plugin present and `setup()` completed. |

### Error codes

| Code | When |
|------|------|
| `CANCELLED` | User cancelled login |
| `NOT_SETUP` | `setup()` was not called |
| `LOGIN_FAILED` | Other login failure (missing fields, SDK error, …) |
| `UNAVAILABLE` | Web / unsupported platform |

**Never log `idToken` or `accessToken`.**

### Nonce (server-side ID token verification)

Generate a random nonce on your backend, store it with the pending session, and pass it to `login({ nonce })`. The LINE SDK embeds that nonce in the ID token. On success, send the raw `idToken` to your backend and verify it with LINE’s [ID token verify API](https://developers.line.biz/en/docs/line-login/verify-id-token/), checking that the `nonce` claim matches what you issued.

## iOS setup (host app)

These steps stay in the **host app**, not inside this plugin.

### 1. Info.plist

Add a URL scheme for LINE callbacks (keep your existing custom schemes):

```xml
<key>CFBundleURLTypes</key>
<array>
  <!-- existing schemes… -->
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>line3rdp.$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    </array>
  </dict>
</array>
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>lineauth2</string>
</array>
```

### 2. Forward open URL / universal links

Import the SPM / CocoaPods module and forward URLs to the LINE SDK **without breaking** your other deep-link handlers (OAuth, Capacitor `appUrlOpen`, etc.):

```swift
import SaharatOngCapacitorLineLogin

func application(
  _ app: UIApplication,
  open url: URL,
  options: [UIApplication.OpenURLOptionsKey: Any] = [:]
) -> Bool {
  // 1) your existing handlers…
  if LineLoginURLHandler.handleOpen(app, url: url) {
    return true
  }
  // 2) Capacitor ApplicationDelegateProxy…
  return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
}
```

Same idea in `SceneDelegate.scene(_:openURLContexts:)`:

```swift
if LineLoginURLHandler.handleOpen(.shared, url: url) {
  return
}
```

**Universal links (optional):** configure Associated Domains + an iOS universal link in the LINE Developers Console, then call `LineLoginURLHandler.handleContinue(_:)` from `application(_:continue:restorationHandler:)` / `scene(_:continue:)`. You can also call `LineLoginURLHandler.setup(channelId:universalLinkURL:)` with that URL if you prefer native setup before JS `setup`.

### 3. LINE Developers Console

- iOS bundle ID of your app  
- iOS universal link (optional)

Run `pod install` / `npx cap sync` after installing the package.

### Swift 6 notes

This plugin targets **Swift 6** language mode (`Package.swift` `swiftLanguageMode(.v6)`, podspec `swift_version = '6.0'`).

- `LineLoginURLHandler` is `@MainActor` because LINE SDK’s `LoginManager.application(_:open:)` is main-actor-isolated (UIKit URL callbacks already run on the main actor).
- `LineLoginPlugin` hops to the main actor with `Task { @MainActor in … }`. Capacitor 8 invokes plugin methods on its background bridge queue (there is no per-plugin method queue). Non-Sendable `CAPPlugin` / `CAPPluginCall` are passed with `nonisolated(unsafe)` locals so Swift 6 does not emit “Sending … risks causing data races” while behavior stays the same. The file also uses `@preconcurrency import Capacitor`.

After upgrading the plugin, **Product → Clean Build Folder** in Xcode before rebuilding.

## Android setup (host app)

### 1. Dependency

`npx cap sync` adds this plugin’s Android module (which depends on `com.linecorp.linesdk:linesdk`). No extra Gradle dependency is required in the app unless you call the LINE SDK directly.

Ensure the activity that hosts Capacitor is **not** `singleInstance` (LINE’s guidance for receiving login results). `singleTask` is fine.

### 2. ProGuard

This plugin ships `consumer-rules.pro` for the LINE SDK and the plugin class. If you minify the app, confirm those rules are applied.

### 3. LINE Developers Console

- Android package name  
- Package signatures: SHA-1 (and SHA-256 if required) for **debug and release** keystores  

## LINE Developers Console checklist

- [ ] Enable **LINE Login** / Mobile app for your channel  
- [ ] iOS bundle ID  
- [ ] iOS universal link (optional)  
- [ ] Android package name  
- [ ] Android signing SHA-1 / SHA-256 (debug + release)  
- [ ] OpenID / email scopes as needed for your product  

Never store the **channel secret** in the mobile app.

## Troubleshooting

| Symptom | What to check |
|---------|----------------|
| `NOT_SETUP` | Call `setup({ channelId })` before `login`. |
| `CANCELLED` | User closed the LINE login UI — not a hard failure. |
| Login never returns on iOS | Forward URLs via `LineLoginURLHandler` in AppDelegate/SceneDelegate; confirm `line3rdp.<bundle-id>` URL scheme and `lineauth2` in `LSApplicationQueriesSchemes`. |
| Swift 6 “Sending self/call” | Use this package’s concurrency pattern; clean Xcode build folder. |
| Android result missing | Activity must not be `singleInstance`; ProGuard keep rules from `consumer-rules.pro`. |
| Web / browser | Expected: methods throw `UNAVAILABLE`. |

## Development

```bash
npm install
npm run build    # tsc + rollup → dist/
npm run check    # package selfcheck
```

## License

MIT — see [LICENSE](./LICENSE).

Third-party LINE SDKs are Apache-2.0 — see [NOTICE](./NOTICE).
