# Day 6: Change the app without a release + internal console (Act 3)

## Goal
"From a web console I can find any payment, see its full timeline, and refund it, and I can change what every phone does
right now: kill NFC pay, upgrade a merchant from Free to Pro, or force an update, with no app store release."

## Why it matters for the interview
- JD: *"You cannot hotfix a phone… Kill switches, feature flags, staged rollout, forced update, configuration driven from
  the server rather than baked into a binary. You decide how that works in your first weeks and it stays decided for years."*
- India JD: *"Internal tools that let our team resolve an issue in minutes."* / *"You have built an admin… console."*
- Site: Free / Pro / Business plans, which become feature flags.
- This is **Act 3**.

---

## Concepts to understand first

### 1. The remote config contract
`GET /config` (per device + merchant) returns:
```json
{
  "version": 42,
  "minSupportedVersion": "1.0.0",
  "latestVersion": "1.2.0",
  "killSwitches": { "nfc_pay": false, "refunds": false, "topup": false },
  "flags": { "tips": true, "discreet_mode_default": false },
  "plan": "pro",
  "features": ["dynamic_qr", "refunds", "tips", "staff_roles"],
  "limits": { "reauthAboveCents": 5000, "maxPaymentCents": 50000 },
  "messages": { "banner": null },
  "ttlSeconds": 60
}
```
- Fetched on launch and on every foreground, and pushed via SSE `config` events so the demo is instant.
- **Cached** on device (MMKV). If the fetch fails, use the cache; with no cache, use **safe defaults bundled in the binary**.
- The defaults are *conservative*: risky features stay off until the server says otherwise.

### 2. Kill switch vs feature flag vs plan feature
| Kind | Who flips it | Example | Default when unknown |
|---|---|---|---|
| Kill switch | On-call engineer during an incident | `nfc_pay` broken on Android 16 | Feature **on** (from cache); off only if told |
| Feature flag | Product, for rollout or experiments | `tips` for 10 % of merchants | **Off** |
| Plan feature | Billing state | `dynamic_qr` requires Pro | Last known plan |

Same delivery mechanism, different owners and defaults. Saying that clearly is senior.

### 3. Forced update
- `appVersion < minSupportedVersion` → a **blocking** `UpdateRequired` screen (root navigator; no deep link gets past it).
- `appVersion < latestVersion` → a soft banner.
- Why both: forced update is for security and protocol breaks; soft is for everything else. Be careful: if forced update is
  abused, users uninstall.

### 4. Staged rollout (talk about it, mock it)
Store-side: App Store phased release (7 days) and Play staged rollout (%). App side: flags with a percentage + a stable
device bucket (`hash(deviceId) % 100`). Watch crash-free rate per cohort before going to 100 %.

### 5. Server-side enforcement
Hiding a button isn't security. The API **also** checks plan features and kill switches. A Free merchant calling the
dynamic-intent endpoint gets `403 plan_required`.

### 6. The console's audit log
Every write action (refund, plan change, flag flip) is stored as `{ actor, action, target, reason, at }`. Refunds above
a threshold need a reason. Four-eyes approval is "next".

---

## Tasks

### A. Remote config (≈2 h)
- [ ] API: `config` table (global) + per-merchant plan → `GET /config`, `PATCH /admin/config`, SSE `config` event
- [ ] API: plan/kill-switch guards on routes (`requireFeature('dynamic_qr')`)
- [ ] Mobile: a `useRemoteConfig()` provider, MMKV cache, bundled defaults, refetch on `AppState` active
- [ ] Mobile: a `<Feature name="nfc_pay">` gate component + `useFeature()`
- [ ] Mobile: an `UpdateRequired` root gate (compare with `react-native-device-info` version or the `package.json` version)
- [ ] Gate in the app:
  - [ ] Dynamic QR → Pro (Free merchants only see "Mein QR" + an upsell)
  - [ ] Tips → Pro
  - [ ] Refunds → Pro + manager
  - [ ] Tap to Pay button → `nfc_pay` kill switch

### B. Web console (≈4 h)
- [ ] `apps/console`: Vite + React + TS + Tailwind 4 + shadcn/ui (start `packages/web-ui` here: Tailwind preset from tokens + restyled shadcn); tokens as CSS variables from `@zahln/shared`; light/dark
- [ ] Simple login (dev password from env), with every request carrying an admin token
- [ ] **Payments**: TanStack Table, search by ID / merchant / amount, status filter, live rows via SSE
- [ ] **Payment detail**: event timeline (created → scanned → authorised → submitted → settled → refunded), ledger postings,
      refund button with a required reason
- [ ] **Merchants**: list, detail with plan selector (Free/Pro/Business), staff, today's volume, CSV export
      (DATEV-style columns: date, receipt number, amount, VAT rate, VAT, payment ID)
- [ ] **Control room**: kill switches, flags, min/latest version, chaos mode selector (the demo panel for Acts 2 + 3)
- [ ] **Audit log** page

### C. Wire the demo (≈1 h)
- [ ] Run all three acts end to end from the console
- [ ] A seed reset button / `pnpm demo:reset` that restores balances and plans to their starting values

---

## As built (deviations and honest caveats)
| Plan said | What happened | Why |
|---|---|---|
| `PATCH /admin/config` | `PUT /admin/config` with the whole `AdminConfig` (zod-validated) **plus a required reason**; the server diffs it, bumps the version, writes `{changed: [...]}` to the audit log and nudges phones over `GET /config/events` (SSE) | A whole-document write is simpler to validate and diff than a patch; the diff is what the audit log needs |
| One `/config` per device + merchant | `GET /config` works **signed out** (`x-app` header), so the forced-update gate works before login; a signed-in till also gets its merchant's `plan` + `features`; each app has its **own** min/latest version | Two binaries, two release trains |
| `<Feature>` gate component | `useFeature(feature, fallbackPlan)` and `useKillSwitch()` hooks in mobile-core; `UpdateRequiredScreen` + `ConfigBanner` in mobile-ui | Hooks were enough at every call site |
| Bundled defaults | `bundledDefaults(app)` in shared: no kill switch fired, flags off, no plan features, **never** a forced update | A stale default must not lock anyone out of their money |
| Login with a dev password | Ops token + operator name (`x-admin-token`, `x-admin-name`), checked in an `onRequest` hook **before** validation, timing-safe; kept in `sessionStorage` | Stand-in for SSO; every audit row says `console:<name>` |
| Audit log | Append-only **in Postgres** (trigger rejects UPDATE/DELETE), tested | "Append-only" enforced by convention isn't append-only |
| Console refunds | `POST /admin/payments/:id/refunds`, idempotent, by ops (`refunds.created_by_ops`, a check constraint says exactly one actor) and **still allowed while the `refunds` kill switch is on** | Support must be able to fix things during an incident |
| shadcn/ui in `packages/web-ui` | Hand-rolled primitives (Button, Field, Dialog on `<dialog>`, Switch, Badge, StatusBadge) and a **Tailwind 4 theme generated from the shared tokens**; `src/theme.css` is a file snapshot (`pnpm --filter @zahln/web-ui theme`), a test fails if it drifts | Eight small components didn't justify a generator and Radix; the tokens stay the single source |
| TanStack Table | v9 (`useTable` + `tableFeatures({})`), search and status filter done on the server | Search is by amount (`6,30`), merchant, payer or ID prefix |
| Live rows via SSE | `GET /admin/events` streamed with `fetch` (EventSource can't send headers), parsed by hand, reconnect with backoff; changed rows are patched into the query cache and flash | — |
| Control room | Edits are a **draft**: a publish bar lists the changed paths, the dialog shows old → new and needs a reason; release cards preview what a 0.1.0 phone will see (blocked / banner / up to date) | No accidental one-click forced update |
| `pnpm demo:reset` | "Reset demo data" in the control room (`POST /admin/reset`): seed balances, plans and config; phones stay signed in; the audit log is kept | — |
| Wallet top-up kill switch | Hidden in the app **and** refused by the API (`503 feature_disabled`) | Hiding a button isn't security |

Found and fixed while verifying: the API's CORS allowed only GET/HEAD/POST, so every console `PUT` failed in the browser
(tests use `inject`, which skips CORS). Now PUT is allowed.

**Verified live (iOS simulator + console, 18 Oct):** publishing a banner + the `topup` kill switch → banner shown, Aufladen
gone; raising the consumer's `minSupportedVersion` to 0.2.0 → "Bitte aktualisieren" within 1.5 s, no reload; reset →
back to the wallet, still signed in; console refund of 1,00 € → +1,00 € on Lena's phone after pull-to-refresh.
Free → Pro for Döner Ali from the console → audited, `/config` for Ali's till now lists `dynamic_qr`.

**Not verified on a device:** the till side of Act 3 (Pro unlocking the one-time QR on screen, `nfc_pay` hiding Tap to Pay),
because no ZYSYGY build was running; both are covered by API tests and typecheck. The wallet balance doesn't update
live after a console refund (the consumer only listens to SSE during a payment); a wallet push channel is a follow-up.
The offline banner wasn't exercised with the API stopped today.

## Files you'll create
```
apps/api/src/{routes/config.ts, routes/admin/*.ts, lib/features.ts, lib/audit.ts}
packages/mobile-core/src/{remoteConfig.tsx, defaults.ts}  packages/mobile-ui/src/UpdateRequiredScreen.tsx
apps/console/ (vite app)  packages/web-ui/
  src/{routes/Payments.tsx, routes/PaymentDetail.tsx, routes/Merchants.tsx, routes/ControlRoom.tsx, routes/Audit.tsx}
  src/components/ui/* (shadcn)  src/lib/{api.ts, sse.ts}
scripts/demo-reset.ts
```

## Commands
```bash
pnpm web
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add table button dialog input select badge switch sheet
```

## Pitfalls
- **Fail-open vs fail-closed confusion.** Decide per switch what happens with no config, and write it down.
- **Config blocking the app start.** Never wait on the network to render. Render from cache/defaults, then update.
- **Forced-update loops:** a store build with a version string the comparison misreads. Use semver comparison and test it.
- **Console showing PII in URLs** (`/users?phone=…`). Use IDs in URLs.
- **Tailwind 4 vs 3 token drift:** both are generated from the same TS tokens. Never hand-edit a generated file.

## Done when
- [ ] **Act 3 works live:**
  - [ ] Döner Ali Free → Pro unlocks dynamic QR on the till within 2 s
  - [ ] The `nfc_pay` switch hides Tap to Pay
  - [ ] Raising `minSupportedVersion` blocks the app
  - [ ] Lowering it recovers
- [ ] With the API stopped, the app still starts (from cache) and shows an offline banner
- [ ] Find Lena's last payment in the console in under 10 s, see the timeline, refund 1,00 €, see it on her phone
- [ ] The audit log shows every action from the demo run

## Interview drill
1. "A bug in NFC pay ships to 100 % of Android users on Friday evening. Walk me through the next hour."
2. "What's the difference between a kill switch and a feature flag?"
3. "What does the app do when it can't reach the config endpoint?"
4. "When would you force an update, and when wouldn't you?"
5. "How would you secure this console for a real ops team?"

## Commit
```
feat(api): remote config, plan features and kill switch guards
feat(mobile): remote config provider, feature gates and forced update
feat(web): admin console with payments, timelines, refunds and merchants
feat(web): control room for flags, versions and chaos; audit log
```
