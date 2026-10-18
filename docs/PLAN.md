# Zahln MVP — Plan

Interview MVP for the two Zahln founding mobile roles (Germany EXIST + India RN).
One week, full-time. Shown three ways: live screen share, GitHub repo, 2-minute video.

---

## What the product actually is (from zysygy.de + both JDs)

**ZYSYGY** is the merchant product; **Zahln** is the network and consumer wallet. The landing page is merchant-first.

- **Merchant flow (their 4 steps):** open the app → pick items from the catalogue or type an amount → a QR appears
  that is *unique to this transaction, valid only for this amount, valid for 5 minutes* ("Waiting for scan") →
  the customer scans, the amount is prefilled, one tap to pay → paid, money is in the merchant's ZYSYGY wallet
  instantly, receipt sent, stock updated.
- **Two ways to pay:** QR scan, or phone-to-phone NFC tap ("like tapping a card on a reader, without the reader").
- **Merchant wallet:** balance updates the moment the customer pays; automatic end-of-day settlement to a German
  bank account over SEPA Instant; withdraw any time.
- **Staff:** staff accept payments and see their own shift; managers see everything, issue refunds, run reports.
- **Offline promise:** "if the connection drops during a transaction, the app holds the payment and confirms it
  automatically when the connection returns."
- **Compliance:** GoBD-compliant records, DATEV export, KassenSichV receipts via Fiskaltrust/TSE, data on German servers.
- **Business model:** 0 % transaction fees forever; revenue from plans:
  - **Free (€0):** unlimited QR + NFC, 1 staff account, digital receipts, simple history, merchant **@handle and static QR**.
  - **Pro (€29):** up to 5 staff with roles, **dynamic QR for custom amounts**, live payment dashboard, shift and daily
    reports, GoBD cash-book export, payment requests by phone number, tips, full and partial refunds.
  - **Business (€59):** unlimited staff, product catalogue, QR menu ordering, DATEV/CSV, Fiskaltrust/TSE, inventory,
    promotions, recurring mandates, automatic daily settlement.
  - **Enterprise:** Studierendenwerke (student unions), chains, municipal operators → the campus launch in the JD.
- **Target merchants:** cafés/restaurants, retail, beauty, trades (send a request after the job), taxi,
  market stalls, online (payment links).
- **Language:** German first, English second.

### What this changes in the MVP
1. **The merchant till is a first-class app, not a side screen.** Catalogue grid + keypad, the 5-minute QR with a
   live countdown, tips, full/partial refunds, staff vs manager roles, shift report.
2. **Plan tiers become feature flags.** The same server-driven config that powers kill switches also gates
   Free/Pro/Business features. Switching a merchant from Free to Pro in the console unlocks dynamic QR live.
   One mechanism, two business uses. That's a strong interview point.
3. **Static QR / @handle (Free) is a separate payment path:** the customer types the amount. More states to handle.
4. **Their offline promise is the hardest problem in the product.** Act 2 shows an honest version of it and the ADR
   explains what can and can't be promised without a card network's guarantee (see ADR 2).
5. **Receipts carry GoBD-style fields** (sequence number, timestamp, VAT breakdown) and the console has a DATEV-style
   CSV export, so it shows you read their compliance story.
6. **Copy is German-first** with an EN toggle, matching the site.

---

## What the MVP has to prove

| JD / site says | MVP proves it with |
|---|---|
| "You cannot hotfix a phone" | Kill switch, feature flags, forced update, server-driven config, flipped live from the console |
| "Campus wifi will drop a request after the money has already moved" / "app holds the payment" | Idempotency keys, no blind retries, a `checking` state that reconciles with the server |
| "You think in states rather than screens" | One typed payment state machine shared by both apps, every state has a screen, unit-tested |
| "Know when dropping below RN is the right call" | Two small native modules (Swift + Kotlin): secure screen and Android NFC HCE |
| "Logging that never puts a token or a balance in a crash report" | Log/crash scrubber, keychain storage, cert pinning, screenshot protection |
| "Accessibility from the first screen", German + English | Screen-reader labels, Dynamic Type, de/en strings from day one |
| Plans: Free / Pro / Business | Plan tiers as server-driven feature flags |
| India JD: "internal tools that resolve an issue in minutes" | Web console: find a payment, see its timeline, refund it, export CSV |

---

## The demo (5 minutes, three acts)

**Act 1: Café Mila checkout (90 s)**
Two simulators side by side. On the till: Cappuccino + Croissant → €6.30 → "Generate QR". The QR shows
"Valid for 5 minutes · Waiting for scan" with a countdown. The customer scans: "Café Mila · €6.30", amount prefilled,
Face ID, paid. The till turns green and the merchant wallet balance ticks up at the same moment. Show the
time-to-confirmation number on screen. Optional: tip prompt, then a partial refund by a manager.

**Act 2: Wifi drops after the money moved (2 min)**
In the console, turn on chaos "drop response after settlement". Pay again. The app does not show "failed" and
does not retry. It shows "Checking with your bank…", reconciles with the same idempotency key → "Paid".
Then the variant where the rail actually rejects → "Not charged". Explain why an automatic retry would charge the
student twice, and how this is the honest version of "the app holds the payment".

**Act 3: Change the app without a release (90 s)**
In the console:
1. Switch Café Mila from **Free → Pro**: dynamic QR appears on the till (on Free it only had the static @handle QR).
2. Toggle the `nfc_pay` kill switch: the "Tap to Pay" button disappears within seconds.
3. Raise `min_supported_version`: a blocking "Update required" screen. Lower it again: the app recovers.

Close with: "Everything you just saw is a decision I'd make in week one, and here are the ADRs."

---

## Architecture

pnpm TypeScript monorepo.

```
zahln/
  apps/
    mobile/      bare React Native 0.88 (iOS + Android), consumer + merchant modes
    api/         Node + Fastify, Postgres, ledger, simulated SEPA Instant rail
    web/         React + Vite + Tailwind admin console
  packages/
    shared/      zod schemas, API types, payment state machine, plan/feature definitions,
                 design tokens, i18n strings (de/en)
  docs/
    PLAN.md
    adr/         short architecture decision records (the interview talking points)
```

### Mobile (`apps/mobile`)
- **Bare React Native 0.88**, TypeScript, React Navigation (native stack).
- **Styling:** NativeWind (Zahln's stack) driven by design tokens from `packages/shared`.
- **Data:** TanStack Query for server state, Zustand for small local state (session, app mode).
- **Payment state machine:** a hand-written typed reducer (discriminated unions) in `packages/shared`, not XState,
  so every line is easy to explain.
  Consumer: `idle → scanned → confirming → authorising → submitting → checking → paid | not_charged | failed |
  expired | insufficient_balance`.
  Merchant intent: `draft → awaiting_scan (5 min) → scanned → paid | expired | cancelled`, then
  `partially_refunded | refunded`.
- **Two modes in one app** (chosen at onboarding; two simulators = two phones):
  - **Consumer (Zahln):** wallet + balance, top-up (mock), scan to pay (dynamic or static QR), receipts, history,
    search, transaction detail, report a problem.
  - **Merchant (ZYSYGY):** catalogue grid + keypad, dynamic QR with countdown, static @handle QR, live
    "payment received", tips, full/partial refund (manager only), shift report, wallet with withdraw and
    "settles daily at 23:00".
- **Device layer:**
  - QR: `react-native-vision-camera` code scanner.
  - Biometrics + secure storage: `react-native-keychain` (biometry-protected item, so Face ID gates the key rather
    than just being a UI prompt).
  - **Native module 1, `SecureScreen` (Swift + Kotlin):** `FLAG_SECURE` on Android; on iOS, blur the app-switcher
    snapshot and detect screen capture. Used on PIN, balance and receipt screens.
  - **Native module 2, `NfcPay` (Kotlin, Android only):** Host Card Emulation prototype; the till reads the payment
    intent by phone-to-phone tap. On iOS, a QR fallback and an ADR on what Apple allows (EEA HCE entitlement).
- **Release safety:** `/config` fetched on launch and on foreground → feature flags, kill switches, plan features,
  `min_supported_version` → forced-update gate. Cached, with a safe default if the fetch fails.
- **Security:** cert pinning, log scrubber (no tokens, IBANs or balances), re-auth rules (pay over €X, refund,
  change PIN, export data), session lock after N seconds in the background.
- **i18n + a11y:** i18next with de (default) and en, `accessibilityLabel`/`Role` on every control, Dynamic Type safe
  layouts.
- **Onboarding (mocked KYC/KYB):** phone → OTP (fake) → PIN → biometrics → device binding (keypair in the keychain,
  public key sent to the API). The merchant path adds business name, @handle and role.

### API (`apps/api`)
- **Fastify + Postgres** (Docker Compose), Drizzle ORM, zod validation shared with the app.
- **Double-entry ledger:** consumer wallet, merchant wallet, settlement and refund accounts; balances are derived
  from postings, never stored as one mutable number.
- **Idempotency:** `Idempotency-Key` header required on every money-moving POST; the stored response is replayed.
- **`PaymentRail` interface** with `SimulatedSepaInstantRail` (configurable latency and failure modes). A real
  provider plugs in behind the same interface later.
- **Payment intents:** the merchant creates an intent (amount, line items, 5-min expiry) → the QR encodes a signed
  intent reference → the consumer confirms → the rail settles → status is pushed over SSE to both phones and the console.
- **Merchants:** plan (free/pro/business), staff with roles, catalogue, @handle, GoBD-style receipt numbering,
  scheduled daily settlement job.
- **Remote config:** global flags + kill switches + min version + per-merchant plan features.
- **Chaos controls** (dev only): drop the response after settlement, rail rejects, slow rail, insufficient funds.

### Web console (`apps/web`)
- React + Vite + Tailwind 4 + shadcn/ui + TanStack Table, sharing tokens and types.
- Search users, merchants and payments; a payment detail page with a full event timeline
  (created → scanned → authorised → submitted → settled → refunded); refund.
- Merchant page: change plan, staff, today's volume, DATEV-style CSV export.
- Control room: feature flags, kill switches, minimum version, chaos toggles (drives Acts 2 and 3).

### Testing and tooling
Full rationale in [DECISIONS.md](DECISIONS.md); design system in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- Vitest for the shared state machines, ledger, idempotency and refunds (the logic that costs money).
- Jest + RN Testing Library for payment status screens; Maestro flows for the happy path and the network-drop path.
- React Native Storybook for every primitive in light and dark.
- pnpm + Turborepo, Biome, GitHub Actions (typecheck, lint, test).
- Sentry is not in the MVP; the log scrubber is built so it drops into `beforeSend` later.

### ADRs to write (one page each)
1. Why bare RN instead of Expo (and what I'd gain or lose by switching to their Expo stack).
2. Payment state machine, "never auto-retry a payment", and what "offline payments" can honestly mean on A2A rails.
3. Server-driven config: kill switches, forced update, and plan tiers as feature flags.
4. NFC on iOS vs Android: what Apple and Google allow a third-party app to do.
5. Swappable `PaymentRail`; why no real sandbox in week one.
6. EU data residency for crash and analytics data; GoBD/receipt data model.

---

## Schedule

Step-by-step guides for each day: [docs/days](days/README.md).

| Day | Build | End-of-day check |
|---|---|---|
| 1 | Monorepo, shared package (schemas, state machines, plans), API skeleton, Postgres, ledger, idempotency, rail simulator + tests | `curl` a payment end to end; tests green |
| 2 | RN app on iOS + Android, navigation, tokens, i18n, onboarding (consumer + merchant), PIN, keychain biometrics | Onboard both modes on two simulators |
| 3 | Merchant catalogue + keypad, 5-min dynamic QR, consumer scan → confirm → pay, SSE live status, receipts, wallets | **Act 1 works** |
| 4 | Every payment state, `checking` reconciliation, chaos modes, static @handle QR, tips, refunds, history | **Act 2 works** |
| 5 | Remote config, plan gating, kill switches, forced update, web console (search, timeline, refund, plans, flags, CSV) | **Act 3 works** |
| 6 | Native modules (SecureScreen, NFC HCE), cert pinning, scrubber, Storybook, a11y pass, Maestro | Security checklist done |
| 7 | ADRs, README with GIFs, record the video, rehearse the demo twice | Full 5-minute run with no surprises |

Day 7 is not optional. A rehearsed demo beats one more feature.

---

## Interview prep (alongside the build)

**Questions you'll likely get, and where the MVP answers them**
- "What happens if the request times out after the money moved?" → Act 2 + ADR 2.
- "How would you ship a fix to users who never update?" → Act 3 + ADR 3.
- "Expo or bare?" (their stack is Expo) → ADR 1. Have a fair answer: Expo + config plugins + EAS Update is a strong
  default; here's what bare gave me for the native modules and how I'd move to Expo.
- "What can a third-party app do with NFC on iPhone?" → ADR 4.
- "How do you keep personal data in Europe?" → ADR 6.

**Questions to ask them**
- Which PSP/bank partner runs SEPA Instant for you, and is the ZYSYGY wallet e-money held by that partner?
- The site promises offline payments. What does "confirmed when the connection returns" mean for a merchant who
  hands over the coffee before the money has settled?
- Phone-to-phone NFC on iPhone: are you planning on Apple's EEA HCE entitlement, or QR-only on iOS at launch?
- Is KYC in-house or a partner like IDnow / WebID? (The JD's "stuck in someone else's system" problem.)
- Is the merchant app (ZYSYGY) and the consumer app (Zahln) one codebase or two apps?
- Why does the India listing say "first frontend engineer" when the Germany one describes a second seat?
- How does the EXIST timeline affect the start date and pay?

---

## Out of scope
Real KYC/eID, real banks, QR menu ordering, inventory sync, promotions, recurring mandates, P2P and split bills,
student ID, transport/utilities, real Fiskaltrust/TSE, app store submission.
Mention them as "next", with a sentence on how the current architecture makes room for each.
