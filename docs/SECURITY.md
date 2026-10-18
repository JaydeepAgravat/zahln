# Security checklist

What the MVP does, where, and what production adds. Each line is something you can point at in the code.

## Identity and sessions
- [x] **Phone OTP**, hashed codes, 5-minute expiry, 5 attempts per challenge (`apps/api/src/lib/auth.ts`).
- [x] **Device binding on mobile:** a bearer token only works with the `x-device-id` it was issued to; stored hashed.
- [x] **Web sessions** (`lib/webSession.ts`): httpOnly + SameSite=Lax + Secure cookie, hashed, 12 h idle timeout,
      revoked server-side on sign-out; CSRF double-submit **bound to the session**; roles read fresh per request.
- [x] **CORS:** an allowlist with credentials; never a reflected origin.
- [x] **Step-up:** web refunds, payouts, plan and team changes, payments, device sign-out and data export need an
      OTP from the last 10 minutes.
- [x] **Re-auth in the apps** (`packages/shared/src/reauth.ts`): payments above `limits.reauthAboveCents` (remote
      config) need the PIN, not just Face ID; refunds, PIN change, data export and account deletion always need the PIN.
- [x] PIN: 6 digits, weak PINs refused, cooldown after 5 wrong tries (30 s doubling to 1 h); stored in the
      Keychain/Keystore, never sent to the server.
- [ ] Production: SSO for the ops console (the shared token + name is a stand-in), four-eyes for big refunds.

## Money
- [x] Double-entry ledger; balances are sums; Postgres triggers reject unbalanced transactions and edits.
- [x] Idempotency keys on every money-moving request, scoped per actor; replays return the stored answer.
- [x] One paid attempt per intent (unique partial index); refunds lock the intent row; never more than was paid.
- [x] QR and pay links carry a signed reference (HMAC), never an amount or a payee.

## On the device
- [x] **SecureScreen** (our TurboModule, `packages/secure-screen`): Android `FLAG_SECURE` on the PIN pad, wallet,
      receipts and the refund sheet (no screenshots, no recordings, blank recents thumbnail); iOS blurs the
      app-switcher snapshot and hides the balance while the screen is recorded or mirrored.
- [x] **Root/jailbreak hints:** a warning banner, never a block (easy to fool; blocking only stops honest users and
      locks people out of their money). Production adds **Play Integrity / App Attest** tokens the server verifies,
      and can then require step-up for such devices.
- [x] Links (`zahln://i/…`, universal links) are only acted on after unlock; a link can't skip the PIN.
- [x] Deep links and pay links are references; the app always fetches merchant and amount from the server.

## Network
- [x] **Certificate pinning** for the release API (`api.zahln.example`): iOS `NSPinnedDomains` (CA SPKI + backup),
      Android `network_security_config.xml` `<pin-set>` with two pins and an **expiry date**; system CAs only;
      no cleartext except in debug builds (`src/debug/res/xml`). The pins are placeholders until the domain exists.

  Compute a pin from the CA certificate:
  ```bash
  openssl x509 -in ca.pem -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | base64
  ```
  Rotation: ship the *next* CA's pin as the backup one release ahead; the Android expiry means a forgotten
  rotation degrades to normal TLS instead of bricking old versions.

## Logging and crash reports
- [x] `logger` (`packages/mobile-core/src/logger.ts`) is the only way the apps log; Biome bans `console.*`.
- [x] Every entry goes through `scrub()` (`packages/shared/src/scrub.ts`): keys like `authorization`, `pin`, `phone`,
      `balanceCents`, `amountCents`, `iban` are replaced; IBANs, JWTs, bearer tokens, card-like numbers and phone
      numbers are masked in any string. Tested. The same function becomes Sentry's `beforeSend`.
- [x] The API's pino logger redacts authorization, cookies, admin tokens, codes and balances.

## Privacy (GDPR)
- [x] **Export** (Art. 15/20): `GET /me/export` in the app (PIN), `GET /web/wallet/export.json` on the web (step-up).
- [x] **Delete** (Art. 17): `DELETE /me` (PIN): name and phone cleared, sessions and devices revoked, team
      memberships removed; refused while money is left or while the person owns a business. Ledger and payment
      records stay for 10 years (§ 147 AO), linked to the anonymised user row.
- [x] Data minimisation: merchants see payers as "Lena H."; public pay links show merchant data only.
- [ ] Production: data processing agreements, retention jobs, a DPO contact, a privacy policy that matches all this.
