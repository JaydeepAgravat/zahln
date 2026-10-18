# Day 11: Below React Native and security

## Goal
"I wrote two native modules myself in Swift and Kotlin, both apps use them, and the apps pass my security checklist."

## Why it matters for the interview
- JD: *"You know when dropping below the React Native layer is the right call and when it is showing off."*
- JD: *"Certificate pinning, keychain and keystore, integrity checks, screenshot handling on sensitive screens,
  logging that never puts a token or a balance in a crash report."*
- JD: *"You have shipped NFC… and know exactly what Apple permits a third party to do."*

---

## Concepts to understand first

### 1. A TurboModule in 5 steps
1. A TypeScript spec: `NativeSecureScreen.ts` with `export interface Spec extends TurboModule { enable(): void; disable(): void; }`
2. `codegenConfig` in `package.json` → Codegen generates the C++/ObjC/Java glue
3. iOS: implement in Swift (with a small ObjC++ shim the generated protocol needs)
4. Android: implement in Kotlin, extending the generated `NativeSecureScreenSpec`
5. Register the package; call it from JS via `TurboModuleRegistry.getEnforcing<Spec>('SecureScreen')`

Put modules in workspace packages: `packages/secure-screen/` and `packages/nfc-pay/` (autolinked into both apps).

### 2. SecureScreen
- **Android:** `window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)` blocks screenshots, recordings, and the
  recents thumbnail. Remove the flag when the screen loses focus. Must run on the UI thread.
- **iOS:** there's no official screenshot block. Do this instead:
  - (a) cover the window with a blur view on `willResignActive` so the app-switcher snapshot is clean;
  - (b) observe `UIScreen.capturedDidChangeNotification` and hide the balance while recording;
  - (c) listen to `userDidTakeScreenshotNotification` to log or warn.
  - Be honest in the interview: a full block isn't possible with public APIs (secure-text-field tricks are fragile).

### 3. NFC: what's actually possible
- **Android HCE (Host Card Emulation):** an app registers a `HostApduService` with an AID (application ID) in
  `apduservice.xml`. Another phone in reader mode (`NfcAdapter.enableReaderMode`) sends `SELECT AID` and gets bytes back.
  → The consumer phone emulates; the merchant phone reads the intent reference. Phone-to-phone works on Android.
- **iOS:**
  - Core NFC can *read* tags (NDEF and some ISO 7816).
  - Since iOS 17.4 (EEA, under the Digital Markets Act), approved apps can do **HCE** with an entitlement (`HCE` /
    "NFC & SE Platform") that requires an Apple agreement, payment-provider status and a review.
  - Since 2024, Tap to Pay on iPhone lets merchants accept *contactless cards*, but only through approved PSPs. It's not for custom A2A tokens.
  - → On iOS today: QR, and plan for the EEA HCE entitlement. Write this up in ADR 4.
- Note: the HCE demo needs **two real Android phones**. Emulators don't do NFC. If you don't have them, show the code and record a
  video on devices, or explain it.

### 4. Certificate pinning
Pin the **public key (SPKI hash)** of your API's certificate, plus a backup pin, not the leaf cert.
- iOS: `NSPinnedDomains` in Info.plist (`NSAppTransportSecurity`).
- Android: `network_security_config.xml` `<pin-set>` with an expiration date.
- Pinning failures are a rollout risk (a certificate rotation bricks old apps), so the backup pin and an expiry date are mandatory.
  Local dev uses HTTP, so pinning is configured for a `api.zahln.example` release domain and documented.

### 5. Integrity checks (talk about them, stub them)
Play Integrity API (Android) and App Attest / DeviceCheck (iOS) prove that requests come from a genuine app on a real device.
The server verifies the token. MVP: a stub interface + an ADR note.

### 6. Log scrubber
One `logger` used everywhere (Biome bans `console.*`). It redacts keys (`token`, `authorization`, `iban`, `pin`,
`balance`, `amount` in error context) and patterns (IBAN regex, JWT regex). Later the same function becomes Sentry's `beforeSend`.

---

## Tasks

### A. Native modules (≈3 h)
- [ ] `modules/secure-screen` (TurboModule): Android `FLAG_SECURE`, iOS blur-on-resign + capture detection
- [ ] `useSecureScreen()` hook used on PIN, wallet, receipt and refund screens
- [ ] `modules/nfc-pay` (Android only): `HostApduService` that returns the pending intent reference; reader mode on
      the till; JS events `onTagRead`
- [ ] The iOS build compiles with NFC unavailable → "Tap to Pay" (phone-to-phone NFC) is hidden on iOS (plus the kill switch)
- [ ] Brightness module (if not done on Day 4)

### B. Security hardening (≈1.5 h)
- [ ] Pinning config for the release domain (iOS ATS pinned domains, Android network security config) + docs
- [ ] Logger + scrubber + unit tests (feed it a fake IBAN and JWT and assert they're redacted)
- [ ] Re-auth rules from remote config: above `reauthAboveCents`, refunds, PIN change, data export
- [ ] Jailbreak/root heuristics → only a warning banner, never a block (the ADR explains why)
- [ ] GDPR basics: "Meine Daten exportieren" (export my data, a JSON download from the API) and "Konto löschen" (delete account; soft-delete + ledger retention note)
- [ ] `docs/SECURITY.md` checklist

---

## Files you'll create
```
packages/secure-screen/{package.json, src/NativeSecureScreen.ts, ios/*.swift, ios/*.mm, android/**/*.kt}
packages/nfc-pay/{src/NativeNfcPay.ts, android/**/{NfcPayModule.kt, PaymentApduService.kt}, android/res/xml/apduservice.xml}
packages/mobile-core/src/{logger.ts, scrub.ts, reauth.ts}
docs/SECURITY.md
```

## Commands
```bash
pnpm --filter @zahln/consumer ios
pnpm --filter @zahln/merchant android
```

## Pitfalls
- **Codegen not running** → spec file name must start with `Native`, and `codegenConfig.jsSrcsDir` must point at it. Clean the build after changes.
- **Swift + TurboModules:** the generated protocol is ObjC++, so you need a `.mm` bridging file that forwards to Swift.
- **`FLAG_SECURE` set off the UI thread** → crash. Use `runOnUiThread`.
- **HCE AID conflicts:** use a proprietary AID (starts with `F0…`), category `other`, not `payment` (that one needs the user to set
  the app as the default payment app).

## Done when
- [ ] On Android, a screenshot on the wallet screen is blocked; on iOS, the app switcher shows a blurred snapshot
- [ ] The NFC module builds; with two Android devices, a tap moves the intent reference (or a recorded video + code walkthrough)
- [ ] Scrubber tests pass; no `console.*` left (Biome rule)

## Interview drill
1. "Why did you write SecureScreen yourself instead of using a library?"
2. "What exactly can a third-party iPhone app do with NFC in Germany today?"
3. "How do you pin certificates without bricking old app versions?"
4. "What would you never let reach a crash report, and how do you enforce that?"

## Commit
```
feat(native): SecureScreen TurboModule for iOS and Android
feat(native): Android HCE NfcPay module and till reader mode
feat(security): log scrubber, re-auth rules, pinning config, GDPR export and delete
```
