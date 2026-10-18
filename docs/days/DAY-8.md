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

## As built (deviations and honest caveats)
| Plan said | What happened | Why |
|---|---|---|
| `GET /public/intents/:ref` | Done: signature verified, a forged ref is a plain 404, `cache-control: no-store`, and a link opened after expiry flips the intent to `expired` (and tells the till) | The page can never offer a pay button on a dead intent |
| Pay with OTP, same states | `/i/[ref]` is server-rendered (`force-dynamic`); one client island runs the **shared `attemptReducer`**. Paying needs a code from the last 10 minutes (the web's Face ID); signed in but stale → the code goes to the known number automatically | Same state machine as the app, a third client |
| Same idempotency and chaos | `respondToPay()` is now one function used by the app route and the web route: same scope (the user), same replay, same chaos | One implementation, so the web can't drift from the app |
| Key in `sessionStorage` | Saved **before** the request leaves; on reload a saved key → `RESUME` → `checking` (never a new key); cleared on a final answer | Tested: drop → checking → reload → still checking → Bezahlt, one ledger transaction |
| Act 2 via chaos `drop_after_settle` | Works, but Chrome **retries a POST** when a reused keep-alive socket dies before any response; the retry carries the same key, so the server replays and the user sees Bezahlt directly. The Playwright spec therefore lets the request reach the server and resets the connection in the browser | A nice interview detail: the idempotency key is what makes the browser's own retry safe |
| Payment request (24 h) | `/business/requests`: amount + note → link + QR + copy/share; Pro (dynamic QR). The note (`description`) is now part of the intent DTO | Request **by phone number** (into the app's activity) is not built |
| Consumer web wallet | `/wallet`: balance, history (same name minimisation), receipts (only your own; anyone else's is 404), devices with sign-out, JSON data export; device sign-out and export need step-up | Tested in the API; wallet viewed in the browser |
| Poster PDF via `@react-pdf/renderer` | `/business/poster`: server-rendered SVG QR on an A5 print layout; "Drucken" → print or Save as PDF | No PDF library in the bundle |
| Universal links | `/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` routes (team ID and cert fingerprint from env at release); Android intent-filters (`zahln://`, `https://pay.zahln.de/i/*` + `/@*`, `autoVerify`); iOS `zahln` URL scheme; `Zahln.entitlements` with `applinks:pay.zahln.de`, attached to **Release only** | Associated Domains needs a paid team and the domain; Debug simulator builds stay unsigned |
| In-app handling | `usePayLinks()` in the signed-in, unlocked stack: `/i/<ref>` → Pay, `/@handle` → Handle. A link can't skip the PIN | The Pay screen fetches merchant and amount from the server as always |
| JS budget with `next/font` | The checkout imports zod-free subpaths (`@zahln/shared/payment`, `/money`, `/phone`) and no design system | Lighthouse not run on the checkout yet |
| Playwright | 4 specs green against the real stack with the installed Chrome (no browser download): pay link → OTP → Bezahlt; forged link; drop → checking → reload → Bezahlt (one ledger transaction); dashboard live in < 2 s | |

**Not verified:** the Android emulator's Chrome (none running), Lighthouse LCP for the checkout, and real universal links
(they need the domain).

**Verified on the iOS simulator:** rebuilt Zahln with the `zahln` scheme; `xcrun simctl openurl booted zahln://i/<ref>`
while the app was **locked** → it stays on the PIN screen → after the PIN, the Pay screen opens for that intent
(Café Mila, 6,30 €). Found on the way: Metro's inline requires loaded the link listener only when the wallet first
rendered, so a link that arrived while locked was lost; the buffer now starts in `App.tsx`.

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
