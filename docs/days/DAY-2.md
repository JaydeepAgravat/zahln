# Day 2: The app shell (RN, design system, onboarding, PIN, biometrics)

## Goal
"Bare React Native runs on iOS and Android from one codebase, themed with my own design system in light and dark,
in German and English, and both a student and a merchant can onboard with a PIN and Face ID."

## Why it matters for the interview
- JD: *"You own the app. iOS and Android, one codebase, from an empty repository."*
- JD: *"PIN and biometric setup, device binding, session handling."*
- JD: *"Accessibility built in from the first screen."* Today is the first screen.
- Bonus: *"You have built or maintained a design system inside an app."*

---

## Concepts to understand first

### 1. New Architecture (RN 0.88)
- **Fabric** is the new renderer; **TurboModules** are lazily loaded native modules with typed specs (Codegen); **JSI** lets JS
  call C++ directly without the old JSON bridge.
- Why you care: Reanimated 4, vision-camera 5 and your own Day-6 modules all depend on it.

### 2. Metro in a monorepo
Metro only watches the app folder by default. You need `watchFolders: [workspaceRoot]` and `resolver.nodeModulesPaths` so
`@zahln/shared` resolves, and **exactly one copy** of `react` / `react-native` (hoisting gives you that).

### 3. NativeWind 4 + tokens
- NativeWind compiles Tailwind classes into `StyleSheet` objects at build time.
- Tokens come from `packages/shared/tokens` → a Tailwind 3 **preset** generated from them.
- Dark mode: CSS variables per theme (`vars()` in NativeWind) switched by `useColorScheme()`. Use semantic class
  names (`bg-surface`, `text-primary`), never raw colours like `bg-[#fff]`.

### 4. Keychain with biometric access control
`react-native-keychain` `setGenericPassword(…, { accessControl: BIOMETRY_CURRENT_SET, accessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY })`.
- Face ID **unlocks the secret itself**. No biometric means no token, not just "a prompt was shown".
- `CURRENT_SET` → adding a new fingerprint or face invalidates the item, so an attacker can't add their own face.
- `THIS_DEVICE_ONLY` → the item isn't included in iCloud or device backups.

### 5. Device binding
On onboarding, generate a key pair (MVP: a random device secret in the keychain), register the public part / an ID with the
API. Every request carries a device ID; the server can revoke one device. Day 6 mentions the hardware-key upgrade.

### 6. PIN rules
- 6 digits, never stored in plaintext: derive a hash (PBKDF2/Argon2 on the server, or keychain-only on device for the MVP).
- Reject weak PINs (`123456`, `000000`, birthdays are out of scope).
- 5 wrong attempts → a cooldown that grows each time.
- The PIN is the fallback when biometrics fail.

### 7. Session lock
App goes to the background → start a timer; after 60 s → require biometrics/PIN on return. An app switch must not become a
hole (JD wording). Use `AppState`.

---

## Tasks

### A. Scaffold (≈1.5 h)
- [ ] `npx @react-native-community/cli@latest init ZahlnMobile --directory apps/mobile --skip-git-init --skip-install`
- [ ] Rename the package to `@zahln/mobile`; bundle ID `de.zahln.mvp`
- [ ] Metro monorepo config (`watchFolders`, `nodeModulesPaths`)
- [ ] `pnpm install` at the root, `cd apps/mobile/ios && pod install`
- [ ] Build both: `pnpm --filter @zahln/mobile ios`, `pnpm --filter @zahln/mobile android`
- [ ] **Smoke-test risky libraries before writing any features** (open risk #1 and #2 in DECISIONS.md):
  - [ ] nativewind + reanimated + worklets + gesture-handler
  - [ ] react-native-keychain
  - [ ] vision-camera (permissions only)
  - [ ] FlashList
- [ ] Remove `ios/` and `android/` from `.gitignore` (bare RN commits the native folders)

### B. Design system v1 (≈2 h)
- [ ] `tailwind.config.js` using a preset generated from `@zahln/shared/tokens`
- [ ] Theme provider: system scheme + a dev override (needed for Storybook on Day 6)
- [ ] Inter + Inter Display font files linked (`react-native.config.js` assets)
- [ ] Primitives:
  - [ ] `Text` (variants from the type scale; `allowFontScaling` + `maxFontSizeMultiplier` for amounts)
  - [ ] `Button` (primary, secondary, tertiary, destructive, pay)
  - [ ] `Screen` (safe area, 20 pt gutter, scroll)
  - [ ] `Card`
  - [ ] `AmountDisplay` (hero, lg, inline, discreet)
  - [ ] `Keypad` (cents-first entry; also used for the PIN)
  - [ ] `StatusBadge`

### C. Navigation + i18n (≈1 h)
- [ ] React Navigation 7, with root navigators: `Onboarding`, `Locked`, `ConsumerTabs`, `MerchantTabs`, and the
      `UpdateRequired` gate as a placeholder
- [ ] Typed routes (`RootStackParamList`)
- [ ] i18next with `de` as default, a language toggle in settings, and `Intl` for numbers and dates

### D. Onboarding (≈2 h)
- [ ] Welcome → choose **Ich bezahle** (student) or **Ich kassiere** (merchant)
- [ ] Phone number → OTP (fake: always `123456`, shown in a dev banner)
- [ ] Merchant: business name, @handle, role (owner/manager/staff)
- [ ] Create PIN → confirm PIN
- [ ] Enable Face ID / fingerprint (explain why; allow skip → PIN only)
- [ ] Register the device with the API: `POST /devices` returns a session token, stored with biometric access control
- [ ] API side: `POST /auth/otp`, `POST /auth/verify`, `POST /devices`; replace the fake `x-user-id` with a bearer token

### E. Lock screen (≈30 min)
- [ ] `AppState` listener, 60 s background timeout → `Locked` stack
- [ ] Biometric unlock with PIN fallback and an attempt counter

---

## Files you'll create
```
apps/mobile/{metro.config.js, tailwind.config.js, babel.config.js, global.css, react-native.config.js}
apps/mobile/src/
  app/App.tsx  app/navigation/*.tsx
  ds/{Text,Button,Screen,Card,AmountDisplay,Keypad,StatusBadge}.tsx  ds/theme.tsx
  features/onboarding/*  features/lock/*
  lib/{api.ts, secure.ts, i18n.ts, session.ts}
packages/shared/src/tokens/tailwind-preset.ts
```

## Commands
```bash
pnpm --filter @zahln/mobile start
pnpm --filter @zahln/mobile ios --simulator "iPhone 17 Pro"
pnpm --filter @zahln/mobile android
xcrun simctl ui booted appearance dark
```

## Pitfalls
- **Two copies of React** → "Invalid hook call". Check with `pnpm why react`.
- **NativeWind classes not applied** → `global.css` isn't imported, or the Babel preset/`jsxImportSource` is missing, or the
  Tailwind `content` globs don't include `packages/shared`.
- **The simulator has no Face ID enrolled.** In the Simulator menu: Features → Face ID → Enrolled; "Matching Face" to approve.
- **Android keystore biometrics** need `USE_BIOMETRIC` in the manifest and an enrolled fingerprint in the emulator settings.
- **Fonts on Android** use the file name as the family name, and on iOS the PostScript name. Name the files to match.
- Don't polish screens yet. Get the flow working on both platforms first.

## Done when
- [ ] Both simulators (iOS + Android) onboard: one as Lena (student), one as Café Mila (manager)
- [ ] Killing and reopening the app → Face ID unlock, not onboarding again
- [ ] Switching the simulator to dark mode re-themes every screen correctly
- [ ] Switching to English works without restarting; amounts format as `€6.30` in English and `6,30 €` in German
- [ ] VoiceOver (iOS: Accessibility Inspector) reads every onboarding control with a label and role

## Interview drill
1. "What does the New Architecture change for you as an app developer?"
2. "Is a Face ID prompt enough to protect a session token? What is `BIOMETRY_CURRENT_SET` for?"
3. "What happens when the user adds a new fingerprint?"
4. "How do you stop the app switcher from leaking the balance?" (preview of Day 6)
5. "How did you set up dark mode so screens can't use the wrong colour?"

## Commit
```
feat(mobile): bare RN 0.88 app with monorepo metro config
feat(ds): Quittung tokens, theme provider and first primitives
feat(mobile): onboarding with OTP, PIN, biometrics and device binding
feat(mobile): background session lock
```
