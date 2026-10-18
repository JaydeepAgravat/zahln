# Day 8: Zahln Web II: pay-link checkout and consumer web wallet

## Goal
"A merchant sends a pay link. On a phone without the app, the link opens a fast web checkout that shows the
merchant and amount from the server, and the customer pays with OTP. The checkout uses the same states, the same
idempotency and the same 'checking' recovery as the app. Consumers can also see their wallet and receipts on
the web."

## Why it matters for the interview
- zysygy.de lists **online merchants: payment links** and **payment requests by phone number** (Pro).
- It proves the payment state machine really is *shared*: one reducer in `@zahln/shared`, three clients.
- Performance on a cheap phone is measured: the checkout is server-rendered with a tiny JS budget.

---

## Concepts to understand first

### 1. One URL, three outcomes
`https://pay.zahln.de/i/<intentId>.<sig>` (locally `http://localhost:3000/i/…`):
- **App installed** → the universal link / app link opens Zahln straight on the confirm screen (Day 4 handles the
  URL).
- **No app** → the web checkout renders server-side, showing the merchant, line items, amount and "valid for 4:12".
- **Expired / paid / cancelled** → an honest final page, never a pay button.

The URL is a *reference*. The page re-fetches the intent from the API and never trusts query params for the amount
or payee.

### 2. Universal links / app links (set up, verified locally where possible)
- iOS: `apple-app-site-association` served at `/.well-known/` with `appID: TEAMID.de.zahln.app` and `paths: ["/i/*"]`,
  plus the Associated Domains entitlement.
- Android: `assetlinks.json` with the signing cert SHA-256, plus an `intent-filter` with `autoVerify`.
- These can't be verified against `localhost`, so the demo uses `xcrun simctl openurl` / `adb shell am start` with
  the custom scheme fallback. The ADR says what changes in production.

### 3. The web consumer state machine
The same `paymentAttempt` reducer as the app: `confirming → authorising (OTP instead of Face ID) → submitting →
checking → paid | not_charged | …`. The idempotency key is generated once per attempt and kept in
`sessionStorage`, so a refresh during `checking` resumes reconciliation instead of paying twice.

### 4. Budgets for the checkout
LCP < 1.5 s on mobile 4G, client JS < 70 KB gzipped (the reducer + one island), no web fonts that block render
(`next/font` with `display: swap`, Inter subset).

### 5. Static QR poster
Free-plan merchants have a static @handle QR. The dashboard generates a printable A5 poster PDF (ember header,
merchant name, QR, "Mit Zahln bezahlen") with `@react-pdf/renderer` on the server.

---

## Tasks

### A. Checkout (≈3.5 h)
- [ ] `GET /public/intents/:ref` (signature verified, minimal fields only)
- [ ] `/i/[ref]` server-rendered page: merchant avatar, line items, total, a countdown island, "In der App öffnen" (open in the app) + "Im Browser bezahlen" (pay in the browser)
- [ ] OTP sign-in sheet (reuses `/web/auth`, consumer scope) → confirm → pay with `Idempotency-Key`
- [ ] Outcome pages: Bezahlt (the flood animation, CSS-only), Nicht belastet (not charged), Abgelaufen (expired), Wird geprüft (being checked: reconciles, survives a refresh)
- [ ] Chaos `drop_after_settle` works on the web exactly as in the app (Act 2 on a laptop)

### B. Payment requests (≈1 h)
- [ ] Merchant dashboard: "Zahlungsanforderung" (payment request) → amount + note → creates an intent with a 24 h expiry → copy link / QR / share
- [ ] (Pro gate) a request by phone number → it appears in the consumer app's activity as "Offene Anfrage" (open request)

### C. Consumer web wallet (≈1.5 h)
- [ ] `/wallet`: balance, history (the same `counterpartyName` minimisation as mobile), receipt view, "Meine Daten exportieren" (export my data, JSON)
- [ ] Device list: see and revoke signed-in phones (calls `DELETE /devices/:id`)

### D. Universal links + poster (≈1 h)
- [ ] AASA + assetlinks routes; entitlements and intent-filters in both apps (Zahln handles `/i/*`)
- [ ] Static QR poster PDF from the dashboard

### E. Playwright (≈1 h)
- [ ] `checkout.spec.ts`: open a link → OTP (dev code) → pay → Bezahlt
- [ ] `checkout-drop.spec.ts`: chaos drop → Wird geprüft → reload → Bezahlt, and exactly one ledger transaction
- [ ] `dashboard-live.spec.ts`: dashboard open; pay via API helper; the row appears

---

## Files you'll create
```
apps/api/src/routes/public.ts
apps/web/app/i/[ref]/{page.tsx, Checkout.tsx, outcome/*}
apps/web/app/wallet/{page,history,devices}/*
apps/web/app/.well-known/{apple-app-site-association,assetlinks.json}/route.ts
apps/web/app/business/requests/*  apps/web/lib/poster.tsx
apps/web/e2e/*.spec.ts  apps/web/playwright.config.ts
```

## Commands
```bash
pnpm --filter @zahln/web dev
pnpm --filter @zahln/web exec playwright test
xcrun simctl openurl booted "zahln://i/<ref>"
```

## Pitfalls
- **Rendering the pay button on an expired intent** because the page was cached. Use `dynamic = 'force-dynamic'` for `/i/*`, and the countdown island re-validates at 0.
- **A new idempotency key after reload** means a double charge. Persist it per attempt in `sessionStorage`.
- **Leaking the payer** to the merchant's public page. The public intent endpoint returns merchant data only.
- **OTP brute force on the web.** It uses the same per-phone attempt limits and challenge expiry as mobile.

## Done when
- [ ] A pay link opens the checkout on the Android emulator's Chrome, and paying works with the dev OTP
- [ ] Act 2 works in the browser: drop → checking → reload → still checking → Bezahlt, with one ledger entry
- [ ] The same link opens the Zahln app when it's installed (simulated via `openurl`)
- [ ] All three Playwright specs green; checkout LCP < 1.5 s in Lighthouse mobile

## Interview drill
1. "The customer refreshes during 'checking'. What happens, step by step?"
2. "Why not put the amount in the QR or the link?"
3. "How do universal links fail, and what's your fallback?"
4. "How did you keep the checkout's JS under budget?"

## Commit
```
feat(api): public intent endpoint for pay links
feat(web): pay-link checkout with OTP, reconciliation and outcome pages
feat(web): consumer web wallet, payment requests and static QR poster
feat(apps): universal links and app links for /i/*
test(web): Playwright checkout, network drop and live dashboard
```
