# Day 7: Zahln Web I: the merchant dashboard

## Goal
"Café Mila's owner signs in on a laptop and watches today's takings update live as customers pay at the counter.
They can see every transaction and receipt, refund one, check payouts, manage staff, upgrade the plan and export
for their tax adviser."

## Why it matters for the interview
- zysygy.de promises a *"live payment dashboard"* (Pro), *"shift and daily reports"* and *"DATEV export"* (Business).
- It shows the same backend serving a third audience: mobile, internal ops, and now the paying customer.
- It shows web security done properly (cookies, CSRF), which differs from mobile's device binding, and you can
  explain why.

---

## Concepts to understand first

### 1. Cookie sessions for the browser
- `POST /web/auth/otp` → `POST /web/auth/verify` sets `zahln_session`: **httpOnly, Secure, SameSite=Lax, Path=/**,
  12 h idle timeout. The token is hashed in `web_sessions`, the same pattern as device sessions.
- **CSRF:** a double-submit token. The API sets a readable `zahln_csrf` cookie, and every mutating request
  echoes it in `x-csrf-token`. SameSite=Lax already blocks most cross-site POSTs, and the token covers the rest.
- **Why not a bearer token in `localStorage`?** Any XSS can read it. An httpOnly cookie can't be read by JS at all.
- **Scopes:** a web session is `merchant_owner` (for one merchant) or `consumer`. Staff (cashiers) have no
  dashboard access. A cashier's job is the till.

### 2. Next.js App Router data flow
- Server components fetch from the API with the session cookie forwarded (`cookies()` → `fetch`), so the first
  paint already has data, with no spinner wall.
- Mutations go through **server actions**, which add their own Origin check on top of our CSRF token.
- Live data comes from a small client component subscribing to `GET /merchants/:id/events` (SSE, cookie auth). It
  updates the TanStack Query cache, and the server-rendered list is the fallback.

### 3. `packages/web-ui`
- A Tailwind 4 `@theme` built from `@zahln/shared/tokens` (the same colours, spacing and type as the apps), plus
  shadcn components restyled to Ember & ink. These include Button, Input, Table, Dialog, Sheet, Tabs, Badge,
  Command and Toast.
- It is shared by `apps/web` and `apps/console`, so there is one place to fix a focus ring.

### 4. Owner-only actions
Refunds, plan changes and staff changes require the `owner` role **and** a fresh OTP if the session is older than
10 minutes (step-up auth, the same idea as re-auth on mobile).

---

## Tasks

### A. API (≈2 h)
- [ ] `web_sessions` table + migration; `/web/auth/*` routes; cookie plugin; CSRF hook; per-route scope guard
- [ ] `GET /merchants/:id/summary` (today, 7-day, by staff), `/transactions` (cursor pagination, filters), `/payouts`, `/staff`
- [ ] `GET /merchants/:id/events` SSE with cookie auth
- [ ] `GET /merchants/:id/export.csv?from&to`: DATEV-style columns, `;` separator, decimal comma, UTF-8 with BOM (what German Excel expects)
- [ ] Tests: CSRF missing → 403; consumer cookie on a merchant route → 403; cashier → 403; step-up enforced

### B. `packages/web-ui` (≈1.5 h)
- [ ] Tailwind 4 theme from tokens (light/dark via `[data-theme]` + `prefers-color-scheme`); Inter via `next/font`
- [ ] Restyled shadcn set; `Money`, `StatusBadge` and `Avatar` matching the mobile ones; the `ReceiptEdge` SVG

### C. Dashboard (≈4 h)
- [ ] `apps/web` Next.js 16; `/login` (phone → OTP) with the receipt-mark illustration
- [ ] **Heute (Today):** a big takings number (ember count-up), a live feed of payments sliding in, a sparkline by hour, per-staff split
- [ ] **Umsätze (Transactions):** a table with filters (date, status, staff, amount) and a row → receipt sheet (GoBD fields: sequence, timestamp, VAT)
- [ ] **Auszahlungen (Payouts):** next settlement at 23:00, history, "Jetzt auszahlen" (withdraw now)
- [ ] **Team:** staff list, invite by phone, role change (owner only)
- [ ] **Plan:** Free / Pro / Business cards from `plans.ts`; upgrading flips the plan live (the till shows dynamic QR within seconds)
- [ ] **Export:** a date range → CSV download
- [ ] Empty, loading (skeleton) and error states for every page; de/en; light/dark; ⌘K to jump between pages

---

## Files you'll create
```
apps/api/src/{routes/web.ts, lib/webSession.ts, lib/csrf.ts}  apps/api/drizzle/0003_web_sessions.sql
packages/web-ui/{package.json, src/theme.css, src/components/*}
apps/web/{next.config.ts, app/(auth)/login, app/business/{page,transactions,payouts,team,plan,export}/*, lib/api.ts}
```

## Commands
```bash
pnpm --filter @zahln/web dev            # http://localhost:3000/business
pnpm --filter @zahln/api test
```

## Pitfalls
- **Forgetting `credentials: 'include'`** on client fetches means the cookie is silently missing and you get 401s that look like a bug in the auth code.
- **`Secure` cookies on `http://localhost`:** browsers allow them on localhost, but not on a LAN IP. Use localhost for the demo.
- **Hydration mismatch on money and dates:** format with the same locale and timezone (`Europe/Berlin`) on the server and the client.
- **SSE behind Next's dev proxy buffering:** connect the browser straight to the API origin (with CORS + credentials) rather than through a Next route.
- **CSV in German Excel:** without the BOM, umlauts break; with `,` as separator, amounts split into two columns.

## Done when
- [ ] Pay at the till (Act 1) and the payment appears on the dashboard in under a second without a refresh
- [ ] Refund from the dashboard shows on Lena's phone and in the console's audit log
- [ ] Upgrade Döner Ali to Pro on the web and the till shows dynamic QR
- [ ] The exported CSV opens cleanly in Numbers/Excel with a German locale
- [ ] API tests green including the new auth tests

## Interview drill
1. "Why cookies on the web but bearer tokens on mobile?"
2. "Walk me through a CSRF attack on the refund endpoint and why it fails."
3. "Server components or client components for the transactions table, and why?"
4. "How does the dashboard stay correct if the SSE connection drops for a minute?"

## Commit
```
feat(api): web sessions with httpOnly cookies, CSRF and scopes
feat(web-ui): shared web design system from tokens
feat(web): merchant dashboard with live takings, transactions, payouts, team, plan and export
```
