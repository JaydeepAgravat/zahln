# Zahln MVP — Plan

Interview MVP for the two Zahln founding mobile roles (Germany EXIST + India RN).
Full-time, quality over speed (about 13 build days). Shown three ways: live screen share, GitHub repo, 2-minute video.

**Five front ends on one API:**

| # | Front end | Who uses it | Where |
|---|---|---|---|
| 1 | **Zahln**: consumer mobile app | Students and shoppers who pay | `apps/consumer` (bare RN, iOS + Android) |
| 2 | **ZYSYGY**: merchant mobile app | Cashiers, staff and managers at the counter | `apps/merchant` (bare RN, iOS + Android) |
| 3 | **Console**: internal web | Zahln ops and support | `apps/console` (Vite + React) |
| 4 | **Zahln Web**: customer-facing web | Merchant owners (dashboard) and consumers (web wallet + pay-link checkout) | `apps/web` (Next.js) |
| 5 | **The Zahln Edition**: landing page | Everyone, first impression | `apps/landing` (Next.js, Editions-style; see [LANDING.md](LANDING.md)) |

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
| India JD: "internal tools that resolve an issue in minutes" | Internal console: find a payment, see its timeline, refund it, export CSV |
| "Craft" (what the founders care about) | An Editions-style landing page with a CI-enforced performance and accessibility budget |
| One product, many surfaces | Two native apps + three web apps sharing one design system, one schema package and one i18n source |

---

## The demo (5 minutes, three acts)

**Opening (20 s):** start on the landing page. Scroll from the intro frame into chapter I, then click
"Kostenlos starten". That lands on the merchant dashboard in Zahln Web, signed in as Café Mila, and you say:
"Everything on this page is live. Let's make a payment."

**Act 1: Café Mila checkout (90 s)**
Two simulators side by side. On the till: Cappuccino + Croissant → €6.30 → "Generate QR". The QR shows
"Valid for 5 minutes · Waiting for scan" with a countdown. The customer scans: "Café Mila · €6.30", amount prefilled,
Face ID, paid. The till turns green, the merchant wallet balance ticks up, and the row appears on the Zahln Web
dashboard in the browser, all at the same moment. Show the time-to-confirmation number on screen. Optional: tip prompt, then a partial refund by a manager.

**Act 2: Wifi drops after the money moved (2 min)**
In the console, turn on chaos "drop response after settlement". Pay again. The app does not show "failed" and
does not retry. It shows "Checking with your bank…", reconciles with the same idempotency key → "Paid".
Then the variant where the rail actually rejects → "Not charged". Explain why an automatic retry would charge the
student twice, and how this is the honest version of "the app holds the payment".

**Act 3: Change the app without a release (90 s)**
In the console:
1. Switch **Döner Ali** from **Free → Pro**: dynamic QR appears on the till (on Free it only had the static @handle QR). Café Mila is on Business because the catalogue is a Business feature.
2. Toggle the `nfc_pay` kill switch: the "Tap to Pay" button disappears within seconds.
3. Raise `min_supported_version`: a blocking "Update required" screen. Lower it again: the app recovers.

Close with: "Everything you just saw is a decision I'd make in week one, and here are the ADRs."

---

## Architecture

pnpm TypeScript monorepo. Five front ends, one API, shared packages so the five never drift apart.

```
zahln/
  apps/
    consumer/      Zahln: bare React Native 0.88 consumer wallet (iOS + Android), de.zahln.app
    merchant/      ZYSYGY: bare React Native 0.88 merchant till (iOS + Android), de.zysygy.app
    api/           Node + Fastify, Postgres, ledger, simulated SEPA Instant rail
    console/       internal ops console: Vite + React + Tailwind 4 + shadcn/ui
    web/           customer web app: Next.js 16 (merchant dashboard, consumer web wallet, pay-link checkout)
    landing/       "The Zahln Edition": Next.js 16, Lenis + Motion, one OGL shader
  packages/
    shared/        zod schemas, API types, payment state machines, plans, tokens, i18n (de/en), money
    mobile-core/   RN plumbing: app identity, API client, session/lock, keychain, biometrics, prefs, queries, i18n
    mobile-ui/     RN design system + the flows both apps share (onboarding, lock, settings, wallet); depends on core
    web-ui/        web design system: Tailwind 4 preset from tokens, shadcn components restyled to Ember & ink
  docs/
    PLAN.md  DECISIONS.md  DESIGN_SYSTEM.md  LANDING.md  days/  adr/
```

### Mobile: two apps, shared packages
Two real apps, as Zahln and ZYSYGY would ship them: separate bundle IDs, icons, store listings and release
cadences. A cashier never sees a consumer wallet, and a consumer never sees a till.

- **What's shared (`packages/mobile-ui` + `packages/mobile-core`):** everything built on Days 1–2. That covers the
  design system, onboarding steps (phone → OTP → PIN → biometrics), lock screen, settings, session, API client
  and secure storage. Each app composes these into its own navigator.
- **What each app owns:** its navigator, its feature screens, its native project (icon, launch screen, bundle
  ID, permissions) and its Info.plist / manifest strings.
- **Brand:** both apps use Ember & ink and the same receipt mark. Zahln's icon is ember-first (paper receipt on an
  ember tile). ZYSYGY's is ink-first (paper receipt with an ember Z on an ink tile). In the app, both follow the
  system light/dark setting.
- **Runtime:** bare RN 0.88 (New Architecture), React Navigation 7, NativeWind 4, TanStack Query, Zustand + MMKV,
  Reanimated 4, react-native-keychain, vision-camera (consumer only), FlashList.
- **Payment state machines:** hand-written typed reducers in `packages/shared`, used by both apps and the web
  checkout.
  - Consumer: `idle → scanned → confirming → authorising → submitting → checking → paid | not_charged | failed |
    expired | insufficient_balance`.
  - Merchant intent: `draft → awaiting_scan (5 min) → scanned → paid | expired | cancelled`, then
    `partially_refunded | refunded`.
- **Consumer app (Zahln):** wallet + balance, top-up (mock), scan to pay (dynamic or static QR), receipts,
  history, search, transaction detail, report a problem.
- **Merchant app (ZYSYGY):** catalogue grid + keypad, dynamic QR with countdown, static @handle QR, live
  "payment received", tips, full/partial refund (manager only), shift report, wallet with withdraw and
  "settles daily at 23:00", staff vs manager roles.
- **Device layer:**
  - QR scan: `react-native-vision-camera` code scanner (consumer).
  - Biometrics + secure storage: `react-native-keychain` (biometry-protected item, so Face ID gates the key rather
    than just being a UI prompt).
  - **Native module 1, `SecureScreen` (Swift + Kotlin):** `FLAG_SECURE` on Android; on iOS, blur the app-switcher
    snapshot and detect screen capture. Used on PIN, balance and receipt screens in both apps.
  - **Native module 2, `NfcPay` (Kotlin, Android only):** Host Card Emulation prototype. The till reads the payment
    intent from the consumer phone by tap. On iOS there's a QR fallback and an ADR on what Apple allows (the EEA HCE
    entitlement).
- **Release safety:** `/config` is fetched on launch and on foreground. It carries feature flags, kill switches,
  plan features and a **per-app** `min_supported_version` that drives the forced-update gate. It is cached, with a
  safe default if the fetch fails.
- **Security:** cert pinning, log scrubber (no tokens, IBANs or balances), re-auth rules (pay over €X, refund,
  change PIN, export data), session lock after N seconds in the background.
- **i18n + a11y:** i18next with de (default) and en; `accessibilityLabel`/`Role` on every control; layouts that
  survive Dynamic Type.

### API (`apps/api`)
- **Fastify + Postgres** (Docker Compose), Drizzle ORM, zod validation shared with every client.
- **Double-entry ledger:** consumer wallet, merchant wallet, settlement and refund accounts. Balances are derived
  from postings, never stored as one mutable number.
- **Idempotency:** an `Idempotency-Key` header is required on every money-moving POST, and the stored response is
  replayed.
- **`PaymentRail` interface** with `SimulatedSepaInstantRail` (configurable latency and failure modes).
- **Payment intents:** the merchant creates an intent → the QR (or a pay link) encodes a signed reference → the
  consumer confirms in the app *or on the web checkout* → the rail settles → status is pushed over SSE to the
  phones, the dashboard and the console.
- **Auth for three audiences:**
  - mobile: OTP + device-bound bearer (done)
  - web: OTP → httpOnly, `SameSite=Lax` session cookie + CSRF token, scoped to consumer or merchant-owner
  - console: a separate staff identity with roles (support, finance, admin), every write audited
- **Merchants:** plan (free/pro/business), staff with roles, catalogue, @handle, GoBD-style receipt numbering,
  scheduled daily settlement job, DATEV-style CSV export.
- **Remote config:** global flags + kill switches + per-app min version + per-merchant plan features.
- **Chaos controls** (dev only): drop the response after settlement, rail rejects, slow rail, insufficient funds.

### Internal console (`apps/console`)
- Vite + React + Tailwind 4 + `packages/web-ui` (shadcn, restyled) + TanStack Table/Query.
- Search users, merchants and payments. A payment detail page shows the full event timeline (created → scanned →
  authorised → submitted → settled → refunded) and the ledger postings, with a refund action and a mandatory
  reason.
- Merchant page: change plan, staff, today's volume, CSV export.
- Control room: feature flags, kill switches, per-app minimum version, chaos toggles (drives Acts 2 and 3).
- Audit log of every staff action. Data-dense, keyboard-first (⌘K search), ink-first dark UI.

### Customer web app (`apps/web`)
One Next.js app with two signed-in areas and one public page.
- **Merchant dashboard (`/business`):** for the owner, at a desk, on a laptop. Today's takings with a live feed
  (SSE), payouts and the settlement calendar, transactions with filters and receipt view, refunds (owner only),
  staff and roles, catalogue editor, plan & billing (Free → Pro → Business), DATEV/CSV export, @handle and
  printable static QR poster (PDF).
- **Consumer web wallet (`/wallet`):** balance, history, receipts and a GDPR data export, for when you're at a
  laptop.
- **Pay-link checkout (`/i/<intentId>.<sig>`, public):** the page a pay link or a QR opens on a phone without
  the app. It shows the merchant, amount and line items from the server (never from the URL), then "Open in Zahln"
  (universal link) or "Pay on the web" via OTP sign-in, using the same consumer state machine with the same
  `checking` reconciliation. This is how "online merchants: payment links" from zysygy.de works.
- Next.js 16 App Router, server components for data, `packages/web-ui`, Ember & ink with light/dark, de/en.

### Landing page (`apps/landing`)
"Die Zahln Edition · Herbst '26": an Editions-style, chaptered scroll story with public-domain Old Master art
of money-changers, torn-receipt transitions, real app videos in device frames, and a performance budget enforced
in CI. Full teardown and spec: [LANDING.md](LANDING.md).

### Testing and tooling
Full rationale in [DECISIONS.md](DECISIONS.md); design system in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).
- Vitest for the shared state machines, ledger, idempotency and refunds (the logic that costs money).
- Jest + RN Testing Library for payment status screens; Maestro flows (both apps) for the happy path and the
  network-drop path.
- Playwright for the web apps: dashboard login → live payment row; pay-link checkout; console refund.
- Lighthouse CI on the landing page and the checkout (performance, accessibility, CLS budgets).
- React Native Storybook for every primitive in light and dark; Ladle/Storybook for `web-ui`.
- pnpm + Turborepo, Biome, GitHub Actions (typecheck, lint, test).
- Sentry is not in the MVP; the log scrubber is built so it drops into `beforeSend` later.

### ADRs to write (one page each)
1. Why bare RN instead of Expo (and what I'd gain or lose by switching to their Expo stack).
2. Payment state machine, "never auto-retry a payment", and what "offline payments" can honestly mean on A2A rails.
3. Server-driven config: kill switches, forced update, and plan tiers as feature flags.
4. NFC on iOS vs Android: what Apple and Google allow a third-party app to do.
5. Swappable `PaymentRail`; why no real sandbox in week one.
6. EU data residency for crash and analytics data; GoBD/receipt data model.
7. Two apps on shared packages instead of one app with modes.
8. Web auth: httpOnly cookie + CSRF for the browser, device-bound bearer for mobile, separate staff identity for the console.
9. The landing page's performance budget: why one OGL shader and not Three.js, and how the budget is enforced in CI.

---

## Schedule

Step-by-step guides for each day: [docs/days](days/README.md). The rule is quality over speed, but each day
still ends with a check that passes before the next day starts.

| Day | Build | End-of-day check |
|---|---|---|
| 1 ✅ | Monorepo, shared package, API, Postgres, ledger, idempotency, rail simulator + tests | `curl` a payment end to end; tests green |
| 2 ✅ | RN app on iOS + Android, Ember & ink design system, i18n, onboarding, PIN, keychain biometrics | Onboard both modes on two simulators |
| 3 | **Split into two apps:** extract `mobile-ui` + `mobile-core`, create `apps/consumer` + `apps/merchant` with their own native projects, icons and bundle IDs | Both apps build, launch and onboard on iOS + Android; all tests green |
| 4 | Merchant till: catalogue + keypad, 5-min dynamic QR; consumer scan → confirm → pay; SSE; receipts; wallets | **Act 1 works** |
| 5 | Every payment state, `checking` reconciliation, chaos modes, static @handle QR, tips, refunds, history | **Act 2 works** |
| 6 | Remote config, plan gating, kill switches, per-app forced update, internal console | **Act 3 works** |
| 7 | Zahln Web I: web auth (cookie + CSRF), `web-ui` package, merchant dashboard (live takings, transactions, payouts, refunds, staff, plan, export) | Act 1 payment appears live on the dashboard |
| 8 | Zahln Web II: pay-link checkout, consumer web wallet, static QR poster PDF, Playwright | Pay a link from a browser on a phone; Playwright green |
| 9 | Landing I: content, art sourcing (CC0, recorded), lettering, typography, layout of all 10 chapters, static, no motion | Reads beautifully with JS off; Lighthouse a11y 100 |
| 10 | Landing II: Lenis + Motion, frame → index, sticky heroes, torn-paper transitions, shader, app videos | Budgets green on Lighthouse CI; reduced motion verified |
| 11 | Below RN + security: SecureScreen, NFC HCE, cert pinning, scrubber, re-auth, GDPR export/delete | Security checklist done |
| 12 | Quality: Storybook (mobile + web), a11y pass on all five front ends, Maestro, CI pipeline, deploy previews | CI green on a clean clone |
| 13 | ADRs, README with GIFs, record the video, rehearse the demo twice | Full 5-minute run with no surprises |

Day 13 is not optional. A rehearsed demo beats one more feature.

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
- The MVP ships ZYSYGY and Zahln as two apps on shared packages. Is that how you see it, or one app with modes?
- Why does the India listing say "first frontend engineer" when the Germany one describes a second seat?
- How does the EXIST timeline affect the start date and pay?

---

## Out of scope
Real KYC/eID, real banks, real payments on the web checkout (it uses the simulated rail), QR menu ordering, inventory sync, promotions, recurring mandates, P2P and split bills,
student ID, transport/utilities, real Fiskaltrust/TSE, app store submission.
Mention them as "next", with a sentence on how the current architecture makes room for each.
