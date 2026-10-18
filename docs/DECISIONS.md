# Tech Decisions — Zahln MVP

Each choice below records what I picked, what I rejected, why, and the interview question it prepares me for.
Versions were checked on 2026-10-18. The design system has its own doc: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

**How to use this doc before the interview:** read the "Why" and the "If they ask" line for each choice. Every
answer follows the same shape: *the constraint → the choice → the trade-off I accepted → what would make me change it.*
Interviewers at a founding-team stage want to hear the trade-off, not a library list.

---

## Summary

| Area | Choice | Version |
|---|---|---|
| Mobile runtime | Bare React Native (community CLI), New Architecture | 0.88.0 |
| Language | TypeScript (strict) everywhere | — |
| Styling | NativeWind 4 (Tailwind 3 preset generated from shared tokens) | 4.2.7 / tailwindcss 3.4.19 |
| Design system | Own tokens + ~12 primitives + React Native Storybook | @storybook/react-native 10.7.0 |
| Navigation | React Navigation 7, native stack | 7.5.1 / native-stack 7.21.0 |
| Server state | TanStack Query | 5.104.4 |
| Client state | Zustand | 5.0.15 |
| Forms + validation | React Hook Form + Zod (schemas shared with API and web) | 7.90.0 / 4.6.7 |
| Camera / QR | react-native-vision-camera (built-in code scanner) | 5.2.3 |
| QR rendering | react-native-qrcode-svg + react-native-svg | 6.3.26 / 15.16.0 |
| Secrets + biometrics | react-native-keychain (biometric access control) | 10.0.0 |
| Animation + gestures | Reanimated 4 (+ worklets) + Gesture Handler, @gorhom/bottom-sheet | 4.7.1 / 3.4.0 / 5.2.14 |
| Lists | FlashList 2 | 2.3.3 |
| i18n | i18next + react-i18next (de default, en) | 26.5.2 / 17.1.0 |
| API | Fastify 5 (Node, TypeScript) | 5.12.7 |
| Database | Postgres 17 (Docker) + Drizzle ORM | drizzle-orm 0.45.4 |
| Realtime | Server-Sent Events, polling fallback | — |
| Web console | Vite + React + Tailwind 4 + shadcn/ui + TanStack Table | vite 8.3.4 / tanstack-table 9.3.1 |
| Monorepo | pnpm workspaces + Turborepo | turbo 2.11.9 |
| Lint + format | Biome | 2.5.15 |
| Tests | Jest + RN Testing Library (mobile), Vitest (API/shared), Maestro (E2E) | jest 30.5.2 / RNTL 14.1.0 / vitest 5.0.5 |
| Crash/perf monitoring | **Not in MVP** (Sentry EU is the plan; see §5) | — |

---

## 1. Mobile foundation

### 1.1 Bare React Native instead of Expo
- **Chosen:** bare RN 0.88 via `@react-native-community/cli`, with the New Architecture (Fabric + TurboModules).
- **Rejected:** Expo (Zahln's own stack), Expo prebuild/CNG.
- **Why:** this MVP writes two custom native modules (SecureScreen, NFC HCE) and I want to own `ios/` and `android/`
  directly: Info.plist, entitlements, `AndroidManifest`, the HCE service XML. It also proves I can work below Expo.
- **Trade-off accepted:** no EAS Update (OTA JS updates), no EAS Build, more native upgrade work, and no config plugins
  regenerating native folders.
- **What would change my mind:** for the real product I'd seriously consider Expo with CNG + config plugins. Both of
  my native modules can be written as Expo Modules, and EAS Update is a strong extra layer on top of server-driven
  config for "you cannot hotfix a phone".
- **If they ask** *"Our stack is Expo, why didn't you use it?"*: "I wanted to show the native layer without
  abstraction. Everything here ports to Expo: the modules become Expo Modules with config plugins. In production I'd
  pick Expo for EAS Update and faster upgrades, but I'd still treat OTA as a convenience, not the safety net. The
  safety net is server-driven config, because OTA can't change native code and app-store rules limit what it can change."

### 1.2 TypeScript strict, shared types
- Every package uses `strict: true`. API request/response types are inferred from Zod schemas in `packages/shared`,
  so the app, API and console can't drift apart.
- **If they ask** *"How do you keep the app and backend in sync?"*: "One Zod schema per contract in a shared package.
  The API validates with it, and the app parses responses with it, so a backend change that breaks the app fails
  typecheck, not production. With a Go backend I'd generate the same thing from OpenAPI."

---

## 2. UI layer

### 2.1 Styling: NativeWind 4
- **Chosen:** NativeWind 4.2.7, which requires **Tailwind 3.x** (`react-native-css-interop` peer `tailwindcss ~3`).
- **Rejected:** Unistyles 3 (fastest, StyleSheet API), Tamagui (powerful, heavy), plain StyleSheet.
- **Why:** it's Zahln's stack, and class names read the same on mobile and web, so the web engineer can work in the app.
- **Gotcha I know about:** the web console uses Tailwind 4 (for shadcn/ui) while mobile is on Tailwind 3. So tokens
  live as TypeScript in `packages/shared/tokens` and are *generated* into (a) a Tailwind 3 preset for NativeWind and
  (b) CSS variables / `@theme` for Tailwind 4 on web. The tokens are the contract, not the Tailwind config.
- **Risk:** NativeWind 5 is in RC and targets Tailwind 4. Day 2 includes a smoke test with Reanimated 4; the fallback is
  Unistyles 3 with the same tokens.
- **If they ask** *"Isn't NativeWind slow?"*: "v4 compiles classes at build time into StyleSheet objects; the runtime
  cost is mainly in dynamic variants and dark mode. I'd measure it on the payment screen with the React profiler and
  frame rate, and if it shows up, drop to plain StyleSheet for that one hot screen."

### 2.2 Design system: tokens + primitives + Storybook
- Tokens (colour, type, spacing, radius, elevation, motion) for light **and** dark; ~12 primitives
  (Text, Button, AmountDisplay, Keypad, Card, ListRow, Sheet, StatusBadge, QRPanel, Countdown, Toast, Screen).
- React Native Storybook 10 shows every primitive in every state and both themes.
- Full rationale, palette and contrast checks: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- **If they ask** *"How would you build a design system with one designer and two engineers?"*: "Tokens first, shared
  across app and web; a small set of primitives that encode the hard rules (amount formatting, status colours,
  minimum tap size); Storybook as the place where the designer reviews states without running a payment. Screens
  compose primitives and never use raw colours. Biome can enforce that."

### 2.3 Navigation: React Navigation 7 (native stack)
- **Rejected:** Expo Router (pulls in Expo modules), Wix react-native-navigation (heavier native setup).
- **Why:** the standard for bare RN, native transitions via `react-native-screens`, typed params, deep-link config.
- **Design detail:** auth, onboarding and the forced-update gate are separate root navigators, so a blocked version
  can't reach any money screen, even through a deep link.
- **If they ask** *"How do you handle a deep link to a payment when the user isn't logged in?"*: "The link is parsed into
  an intent and held; the auth stack runs; after unlock it resumes the intent, and only after re-validating it with the
  server, since links are untrusted input."

### 2.4 Animation: Reanimated 4 + Gesture Handler
- UI-thread animations for the success moment, the QR countdown ring and bottom sheets (`@gorhom/bottom-sheet`).
- Every animation respects **Reduce Motion** (`useReducedMotion`) and has a non-animated end state.
- **If they ask** *"Why not Animated?"*: "When the JS thread is busy, say parsing a response at the moment of payment, JS-driven
  animations drop frames exactly when the user is watching. Reanimated runs on the UI thread."

### 2.5 Lists: FlashList 2
- Transaction history and the catalogue grid. Cell recycling keeps memory flat on long histories.
- **If they ask** about performance: "I measure, not assume: FlashList's blank-area metric and frame rate on a
  low-end Android with 1,000 seeded transactions."

---

## 3. State and data

### 3.1 TanStack Query + Zustand
- **Server state** (balances, history, payment status, remote config) lives in TanStack Query: caching,
  refetch on app focus, and polling for the `checking` state.
- **Client state** (session lock, app mode, pending payment draft) lives in small Zustand stores.
- **Rejected:** Redux Toolkit + RTK Query (more ceremony), Jotai, XState.
- **Rule:** a balance is never edited optimistically. Money UI shows the server's truth, or an explicit pending state.
- **If they ask** *"Do you do optimistic updates for payments?"*: "No. Optimistic UI is great for a like button and
  dangerous for money. The UI moves to *pending* or *checking* immediately, which feels fast, but it never shows
  *paid* until the server says so."

### 3.2 The payment state machine: hand-written, shared
- A typed reducer with discriminated unions in `packages/shared`, used by the app, unit-tested with Vitest, and
  mirrored by the API's statuses. I chose it over XState so every transition is plain code I can explain line by line.
- **If they ask** *"Walk me through the states of a payment."* Go through them from memory:
  `scanned → confirming → authorising → submitting → checking → paid | not_charged | failed | expired | insufficient_balance`,
  then on the receipt `partially_refunded | refunded | disputed`.

### 3.3 Forms: React Hook Form + Zod
- Uncontrolled inputs (few re-renders); the same Zod schemas validate on the server.
- Amounts are **integer cents** end to end, never floats. Formatting goes through `Intl.NumberFormat('de-DE')` → `6,30 €`.
- **If they ask** *"How do you store money?"*: "Integer minor units plus a currency code. Floats can't represent 0.1
  exactly, and rounding errors in a ledger are a reconciliation incident."

---

## 4. Device layer

### 4.1 Camera / QR: react-native-vision-camera 5
- Built-in code scanner (MLKit on Android, AVFoundation on iOS), with no frame processor needed for QR.
- **Security rule:** a scanned QR is only a reference. The app fetches the intent from the API and shows the
  server's merchant name and amount, never values parsed from the QR, so a sticker over the merchant's QR can't
  silently change the payee.
- **If they ask** *"What about QR fraud?"*: "Dynamic QR codes expire in 5 minutes and are single-use; the payee shown
  comes from the server; static @handle QR codes show a verified merchant name and the customer types the amount."

### 4.2 Secrets + biometrics: react-native-keychain 10
- The session refresh token and the device-binding key are stored with biometric access control
  (`BIOMETRY_CURRENT_SET`), so Face ID / fingerprint actually unlocks the secret, and enrolling a new fingerprint invalidates it.
- **Rejected for MVP:** react-native-biometrics signing keys (Secure Enclave / StrongBox). It's the stronger SCA story
  and the next step; mention it.
- **If they ask** *"Is a biometric prompt enough for SCA?"*: "A prompt alone is just UI. It counts when it gates a
  key: possession (the device-bound key) plus inherence (biometrics) gives two factors. The next step is a hardware key
  that signs each payment's amount and payee, which is what PSD2 dynamic linking needs."

### 4.3 QR rendering: react-native-qrcode-svg
- SVG, so it stays sharp at any size, with error correction level M, a generous quiet zone, and screen brightness raised
  while the QR is shown.

### 4.4 Native modules (written by hand)
- **SecureScreen** (Swift + Kotlin): `FLAG_SECURE` on Android; blur the iOS app-switcher snapshot and react to screen
  recording. Used on PIN, balance and receipt screens.
- **NfcPay** (Kotlin, Android HCE): the consumer phone emulates a card-like service; the merchant phone reads the
  payment intent reference over APDU. On iOS: QR fallback, and an ADR on Apple's EEA HCE entitlement.
- **If they ask** *"When do you drop below RN?"*: "When the platform API has no maintained library, or when the
  library is a thin wrapper I'd have to fork anyway. A screenshot flag is ten lines of native code; adding a
  dependency for it is a supply-chain risk on a payments app. A QR scanner, though, I'd never write myself."

---

## 5. Quality

### 5.1 Tests
- **Vitest** for `packages/shared` and the API: state machines, ledger postings, idempotency replay, refund limits.
- **Jest + RN Testing Library** for components: every payment status screen renders and is reachable by screen reader.
- **Maestro** E2E on a simulator: the happy path and the network-drop path (Zahln's stack).
- **If they ask** *"What do you test first?"*: "Whatever costs money when it's wrong: the ledger always balances,
  replaying an idempotency key never posts twice, and a refund can't exceed the original."

### 5.2 Monitoring: not in the MVP, and the answer is ready
- Sentry isn't wired up in the MVP (my choice, to save time), but the **log scrubber is**, so it plugs straight into
  Sentry's `beforeSend`.
- **If they ask:** "Sentry in its EU region (or self-hosted), with `beforeSend` running the same scrubber that strips
  tokens, IBANs and balances; performance spans for cold start and time to confirmation; release health per staged
  rollout cohort so a bad build is caught at 1 %, not 100 %."

---

## 6. Backend (mock, but realistic)

### 6.1 Fastify 5
- Schema-first, fast, TypeScript; shares Zod schemas through a type provider.
- **Rejected:** Hono (newer), Go (their core backend, but it would lose shared TS types), NestJS (heavy).
- **If they ask** *"Our backend is Go, why Node?"*: "For a one-week mock, shared types beat language parity. The
  contract is what matters: idempotency keys, intent statuses and SSE events are language-agnostic, and I'd describe
  them in OpenAPI for a Go service."

### 6.2 Postgres + Drizzle
- SQL-first, so the ledger is visible: each payment is one database transaction inserting balanced postings
  (debit consumer, credit merchant), with a `CHECK`/test that every transaction sums to zero.
- **Idempotency table:** `(key, request_hash, response, status)` with a unique key; a replay with the same key returns
  the stored response, and a replay with a different body is rejected with 422.
- **If they ask** *"How do you stop double-spending under concurrency?"*: "`SELECT … FOR UPDATE` on the payer's account
  row inside the transaction, the balance check and postings in the same transaction, and a unique idempotency key
  so a duplicate request can't even start a second transaction."

### 6.3 Server-Sent Events
- The till, the consumer receipt and the console subscribe to an intent's events. SSE is one-way, plain HTTP and
  easy through proxies.
- **The rule:** realtime is a *hint*, not the truth. On reconnect or timeout, the client asks the API for the status.
- **If they ask** *"What if the SSE connection drops?"*: "Nothing breaks. The till falls back to polling the intent; the
  customer's `checking` state polls with backoff and the same idempotency key. SSE only makes the happy path instant."

### 6.4 PaymentRail interface
- `SimulatedSepaInstantRail` behind an interface, with chaos modes (drop response after settlement, reject, slow,
  insufficient funds). A real PSP adapter would implement the same interface.

---

## 7. Web console

### 7.1 Vite + React + Tailwind 4 + shadcn/ui + TanStack Table
- Matches Zahln's web stack (React, TS, Tailwind). shadcn components are copied into the repo (Radix-based, accessible),
  and TanStack Table handles search, sort and pagination on payments.
- **Rejected:** Next.js (no SSR need for an internal tool), Mantine (less Tailwind-aligned).
- **If they ask** *"How would you secure the internal console?"*: "SSO with roles, every write action audited
  (who refunded what and why), refunds above a threshold need four-eyes approval, and no PII in URLs."

---

## 8. Tooling

### 8.1 pnpm + Turborepo
- pnpm workspaces with `node-linker=hoisted` (Metro and native autolinking prefer a flat `node_modules`);
  Turborepo caches `typecheck`, `test` and `build` per package.
- **If they ask** *"Monorepo pain with React Native?"*: "Metro needs `watchFolders` for the shared package, there must be a single
  copy of `react`/`react-native`, and autolinking has to resolve from the app folder. Hoisting solves most of it."

### 8.2 Biome
- One fast tool for lint and format instead of ESLint + Prettier. Custom rule ideas: ban raw hex colours in
  screens, ban `console.log` (use the scrubbed logger).

### 8.3 i18next
- German is the default language; English is the fallback toggle. Keys live in `packages/shared/i18n` so app and
  console share copy. Money and dates are formatted with `Intl`, never by string concatenation.
- **If they ask** *"What breaks when you add German?"*: "Length: German strings run ~30 % longer, so buttons must
  wrap or grow, never truncate; plus decimal commas and `6,30 €` currency placement. I test layouts with the
  longest language and the largest Dynamic Type size."

---

## 9. Open risks to check on Day 1–2
1. NativeWind 4 + Reanimated 4 + RN 0.88 New Architecture: smoke test first; fallback Unistyles 3.
2. vision-camera 5 and keychain 10 on RN 0.88: build both platforms before writing features.
3. Storybook 10 for RN inside a pnpm monorepo: Metro config conflicts; isolate it behind an env flag.
4. Android HCE needs a real device for a true phone-to-phone test; the simulator demo uses QR, and HCE is shown on
   a device or in a video.
