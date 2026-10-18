# Day 3: Two apps, shared packages (Zahln + ZYSYGY) ✅ Done

> **Status: complete (2026-10-18).**
> - `apps/mobile` is now `apps/consumer` (**Zahln**, `de.zahln.app`), and there's a new `apps/merchant` (**ZYSYGY**, `de.zysygy.app`).
> - What both apps need lives in `packages/mobile-core` (no UI) and `packages/mobile-ui` (design system + shared flows).
> - The API refuses to bind a ZYSYGY till to a non-staff number (`403 wrong_app`), with a test.
> - **138 tests green:** 93 shared, 41 API, 4 mobile-core. Typecheck and Biome are clean.
> - Icons for both apps come from one script: `pnpm icons` (`scripts/generate-icons.mjs`).
>
> ![App icons](../screenshots/app-icons.png)
>
> Deviations from the plan below are listed under "As built".

## Goal
"Zahln (consumer) and ZYSYGY (merchant) are two separate apps with their own bundle IDs, icons and store
identities. About 90 % of their code is shared packages, and both build, launch and onboard on iOS and Android."

## Why it matters for the interview
- JD: *"You own the app… from an empty repository."* This is the moment the repo becomes a product family.
- zysygy.de sells **ZYSYGY** to merchants and **Zahln** to consumers: two brands, two audiences, two release risks.
- It shows you can refactor a working codebase without breaking it (tests stay green throughout).
- The likely question is *"One app or two?"*, and ADR-007 answers it.

---

## Concepts to understand first

### 1. What goes where
| Layer | Package | Contents (moved from `apps/mobile/src`) |
|---|---|---|
| Design system | `packages/mobile-ui` | `ds/*`: Text, Button, Screen, Card, Icon, Keypad, PinDots, OtpInput, illustrations, Logo, theme |
| Plumbing | `packages/mobile-core` | `lib/*`: api, secure, session, prefs, queries, biometrics, haptics, random, format, i18n |
| Shared flows | `packages/mobile-core/flows` | Onboarding steps (phone, OTP, name, PIN, biometrics), LockScreen, Settings, as screens with props, not navigators |
| App shell | `apps/consumer`, `apps/merchant` | `App.tsx`, the navigator, feature screens, native projects, `metro.config.js`, `babel.config.js`, `tailwind.config.js` |

Rule: **packages never import from apps**, and `mobile-core` never imports from `mobile-ui` (UI sits on top of core).
Biome's `noRestrictedImports` enforces both.

### 2. Shared flows, app-specific wiring
Onboarding differs per app: the merchant app adds "pick your business", and the consumer app adds the camera
permission later. So the flow steps are shared *screens*, and each app owns its *navigator*:

```ts
// apps/merchant/src/navigation/Onboarding.tsx
<Stack.Screen name="Phone" component={PhoneScreen} />
<Stack.Screen name="Otp" component={OtpScreen} />
<Stack.Screen name="Merchant" component={MerchantPickerScreen} />   // merchant only
<Stack.Screen name="PinCreate" component={PinCreateScreen} />
```
The `role` in the draft store disappears. The app *is* the role, sent as `x-app: consumer | merchant` so the API
can reject a consumer login on the till.

### 3. Native projects per app
- Bundle IDs: `de.zahln.app` and `de.zysygy.app`. Display names: "Zahln" and "ZYSYGY".
- Icons: Zahln keeps the ember receipt mark. ZYSYGY gets an ink-first till-receipt mark (ink background, ember Z).
- Permissions: **only the consumer app** declares camera (QR scan). Both declare biometrics.
- Each app has its own `Podfile`, Gradle project and launch screen. Gradle paths still point at the hoisted
  `node_modules` (`../../../node_modules`).

### 4. Metro and NativeWind across packages
- `watchFolders: [workspaceRoot]` already covers `packages/*`.
- Tailwind `content` must include `../../packages/mobile-ui/src/**/*.{ts,tsx}` and `mobile-core`, or classes used only
  inside packages are purged and silently render nothing (the same failure mode as the missing spacing keys on Day 2).
- Packages export TypeScript source (`"main": "src/index.ts"`). Metro compiles them, and nothing gets pre-built.

### 5. Doing it without breaking anything
Move in this order, and run `pnpm typecheck && pnpm test` after each step:
1. Create the packages and move `ds` → `mobile-ui` with `git mv`, so history follows the files.
2. Move `lib` → `mobile-core`.
3. Move shared flows.
4. Copy `apps/mobile` → `apps/merchant` (rename the native project), then rename `apps/mobile` → `apps/consumer`.
5. Strip each app down to its own features.

---

## Tasks

### A. Packages (≈2 h)
- [ ] `packages/mobile-ui` + `packages/mobile-core` with `package.json`, `tsconfig.json`, an `index.ts` barrel and peer deps (react, react-native, nativewind, reanimated…)
- [ ] `git mv` the design system and lib, then fix imports (`../../ds` → `@zahln/mobile-ui`)
- [ ] Biome import boundaries
- [ ] Move `__tests__/session.test.ts` to `mobile-core`, and give the packages their own Jest config

### B. Consumer app (≈1.5 h)
- [ ] `apps/mobile` → `apps/consumer`, package name `@zahln/consumer`
- [ ] Rename the iOS project/scheme to `Zahln` and set the bundle ID to `de.zahln.app` (Xcode project, Info.plist, `applicationId`, `namespace`, Kotlin package path)
- [ ] Remove merchant screens, the role step and the till tab

### C. Merchant app (≈2.5 h)
- [ ] `apps/merchant` (`@zahln/merchant`) with a fresh RN 0.88 native project (`npx @react-native-community/cli init ZYSYGY --version 0.88.0 --skip-install`), then copy in our native tweaks (SceneDelegate background, splash, Gradle paths, Maven mirror note)
- [ ] Bundle ID `de.zysygy.app`, display name "ZYSYGY", no camera permission
- [ ] The ZYSYGY icon set (light, dark and tinted on iOS; adaptive + monochrome on Android) and the launch screen
- [ ] Navigator: onboarding with the merchant picker, then tabs Kasse / Umsatz / Profil
- [ ] Default theme: dark (the till is ink-first); the user can still choose
- [ ] API: `x-app` header; consumer-only accounts get `403 wrong_app` from the merchant app, with a friendly screen ("Diese App ist für Händler. Lade Zahln.")

### D. Tooling (≈1 h)
- [ ] Root scripts: `pnpm consumer:ios`, `consumer:android`, `merchant:ios`, `merchant:android`
- [ ] Turbo pipeline includes the new packages; the README run section is updated
- [ ] Both apps build on both platforms, release configuration included (`--mode Release` once)

---

## As built (deviations and honest caveats)
| Plan said | What happened | Why |
|---|---|---|
| `mobile-ui` never imports `mobile-core` | Reversed: UI depends on core | The design system already used haptics, i18n and prefs. Core is the lower layer with no UI, which is the natural direction |
| Shared flows in `mobile-core/flows` | In `mobile-ui/src/flows` | Flows are screens; they need the design system, so they belong with it |
| Role picker on the Welcome screen | Removed; each app *is* its role (`configureApp` in `index.js`) | A cashier never sees "I pay", and a student never sees "I collect" |
| ZYSYGY dark by default | Both apps follow the system theme; ZYSYGY is ink-first in its icon and launch screen | Prefs are created before `configureApp` runs; forcing dark would override the user's system choice |
| Separate MMKV IDs per app | Not needed | Each bundle ID has its own sandbox, so MMKV and the keychain are already isolated |
| Fresh `react-native init` for ZYSYGY | Copied the consumer native project and renamed it with a script (project, scheme, bundle ID, Kotlin package) | Keeps every Day 2 native tweak (SceneDelegate background, splash, Gradle paths) identical in both apps |
| — | `react-hook-form` removed from the apps | Unused so far; it comes back with the first real form |

Native details:
- Fonts live once in `packages/mobile-ui/assets/fonts`, and both apps link them from there (`react-native.config.js`).
- ZYSYGY doesn't declare or link the camera (no `NSCameraUsageDescription`, no `CAMERA` permission, no VisionCamera pod).
- Metro: Zahln on `:8081`, ZYSYGY on `:8082`, so both can run side by side.
- The first build after the rename is a full clean build (about 10 minutes per iOS app). After that, builds are incremental.
- ZYSYGY debug builds point at Metro on `:8082`: iOS sets `jsLocation` in `SceneDelegate.bundleURL()`, and Android sets
  `reactNativeDevServerPort=8082` in `gradle.properties`. Without this, the ZYSYGY binary silently loads Zahln's bundle from `:8081`.
- The biometrics step could sit blank for about 40 s on a cold iOS simulator while the keychain probed biometry. The probe
  now runs once at app start (`prefetchBiometry()`), and the result is cached.

Verified on device (2026-10-18):
- iOS (iPhone 17 Pro sim): Zahln, where Lena onboards and lands on her wallet (35,40 €). ZYSYGY shows its own Welcome
  screen; Lena's number gets the "not a business" explanation.
- Android (Phone_16k emulator, Android 16): Zahln launches. In ZYSYGY, Mila onboards → Café Mila (Business) → till with
  today's takings.

Android tips learned today:
- **Android 16 local network permission:** debug builds reach Metro at `10.0.2.2`, which Android 16 treats as the
  local network, so the system asks to "find nearby devices". Denying it gives "Unable to load script". Allow it, or run
  `adb shell pm grant de.zahln.app android.permission.ACCESS_LOCAL_NETWORK` (and the same for `de.zysygy.app`).
  Release builds bundle their JS and never ask.
- **Build one ABI while developing:** `./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a` compiles the
  native code for the emulator's architecture only. A clean build drops from 25+ min to about 9 min (3 min for the second app).
- Never run two Gradle builds of the same app at once (CMake's `.cxx` folder races), and `gradlew --stop` kills
  *every* daemon of that Gradle version, including builds of the other app.

## Files you'll create
```
packages/mobile-ui/{package.json, tsconfig.json, src/index.ts, src/*}         (moved from apps/mobile/src/ds)
packages/mobile-core/{package.json, tsconfig.json, src/index.ts, src/*}       (moved from apps/mobile/src/lib)
packages/mobile-core/src/flows/{Onboarding*, PinScreens, LockScreen, SettingsScreen}.tsx
apps/consumer/   (renamed from apps/mobile)
apps/merchant/   (new native project + thin shell)
```

## Commands
```bash
pnpm install
pnpm typecheck && pnpm test
pnpm consumer:ios
pnpm merchant:android
```

## Pitfalls
- **Two copies of `react-native`.** If a package lists it as a dependency instead of a peer, Metro bundles two copies and you get "Invalid hook call". Peer deps only.
- **Purged Tailwind classes** from packages (see concept 4).
- **Renaming an iOS project by hand** misses `PRODUCT_BUNDLE_IDENTIFIER` in one build configuration. Grep the `.pbxproj` for the old ID afterwards.
- **Android package rename:** the Kotlin folder path must match `namespace`, or `MainActivity` won't be found at launch.
- **MMKV/keychain storage IDs:** give each app its own MMKV ID (`zahln`, `zysygy`). Keychain is already isolated by bundle ID.
- **Both apps on one simulator** is fine, but the dev server port must differ (`8081` / `8082`) to run them side by side.

## Done when
- [ ] Both apps are on the home screen of one simulator, each with its own icon and name
- [ ] Lena onboards in Zahln; Mila onboards in ZYSYGY; Lena's number in ZYSYGY gets the "wrong app" screen
- [ ] All tests green (shared, API, mobile-core); typecheck and Biome clean
- [ ] `apps/consumer` and `apps/merchant` each contain only their own features (`grep -r merchant apps/consumer/src` is empty)

## Interview drill
1. "Why two apps? Isn't that double the maintenance?"
2. "What lives in a shared package and what stays in the app? Where's the line?"
3. "How do you stop two copies of React Native ending up in the bundle?"
4. "How would you ship a fix to only the merchant app?"

## Commit
```
refactor(mobile): extract mobile-ui and mobile-core packages
feat(consumer): Zahln app with its own bundle ID and icon
feat(merchant): ZYSYGY app with merchant onboarding and ink-first theme
feat(api): x-app header and wrong_app guard
```
