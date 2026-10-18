# Day 1: Foundations (monorepo, shared package, API, ledger) ✅ Done

> **Status: complete (2026-10-18).** 94 tests green (65 shared + 29 API), typecheck and Biome clean, `curl` flow verified,
> including the dropped-response case. The sections below describe what was actually built. Changes from the
> original plan are listed in [Deviations from the plan](#deviations-from-the-plan).

## Goal
"I can create a payment intent as a merchant, pay it as a consumer with an idempotency key, and the ledger always
balances. Replaying the same request never moves money twice."

## Why it matters for the interview
- JD: *"You know why an automatic retry on a payment request is dangerous."* Today you build the thing that makes
  retries safe.
- JD: *"Think in states rather than screens."* The state machines written today drive every screen on Days 3–4.
- India JD: shared types across app and web, *"a codebase the next engineers can build on."*

No UI today. Getting the money logic right first is the senior move. Say that in the interview.

---

## Concepts to understand first

### 1. Money as integer cents
`6,30 €` is stored as `630` with `currency: "EUR"`. Never floats: `0.1 + 0.2 !== 0.3` in JavaScript. All maths in
cents; format only at the edge with `formatMoney()` → `Intl.NumberFormat('de-DE', …)`.
The Zod schema `CentsSchema` (`z.number().int()`) rejects `6.3` at the API boundary with a 400.

### 2. Double-entry ledger
Every money movement is a **ledger transaction** made of **postings** that sum to zero.

```
Payment 6,30 €, Lena → Café Mila
  posting  consumer_wallet:usr_lena    −630
  posting  merchant_wallet:cafe-mila   +630
  sum = 0  ✓
```

A balance is `SUM(postings.amount_cents) WHERE account_id = X`. It's never a column you `UPDATE`. Refunds are new
postings, never edits.

**What we built goes further: the database enforces the rules itself** (`apps/api/drizzle/0001_ledger_rules.sql`):

| Rule | How it's enforced |
|---|---|
| Every transaction sums to 0 | `DEFERRABLE INITIALLY DEFERRED` constraint trigger that checks at **COMMIT** |
| Postings are append-only | `BEFORE UPDATE OR DELETE` trigger that raises an error |
| Wallets can't go negative | Deferred constraint trigger (behind the row lock, as defence in depth) |
| An intent is paid at most once | Partial unique index `one_paid_attempt_per_intent` on `payment_attempts(intent_id) WHERE status = 'paid'` |
| Refunds never exceed the payment | `CHECK (refunded_cents <= amount_cents)` |

Interview line: *"App code checks first for a nice error; the database checks again so a bug can't persist bad money."*

Accounts:
- `consumer_wallet:<userId>`
- `merchant_wallet:<merchantId>`
- `topup_source` (system account, may go negative)
- `settlement_outbound` (system account, for Day 3 payouts)

### 3. Idempotency keys
The client generates a UUID **before** sending a money-moving request and sends it as `Idempotency-Key`.
Keys are scoped per user (like Stripe scopes them per account) and lower-cased.
`apps/api/src/lib/idempotency.ts → withIdempotency()`:

| Situation | Server does |
|---|---|
| First time | Claim the key (`processing`), run the handler, store the response, return it |
| Same key + same body, completed | Return the stored response with header `idempotent-replayed: true` |
| Same key + different body | `422 idempotency_key_reused` (the client has a bug) |
| Same key, still processing | `409 idempotency_in_progress` ("ask again") |
| Same key, processing for > 30 s | The first request died before committing; take over the key |
| Handler throws | Nothing was committed, so the key is released and a retry with the same key is allowed |

**The important detail:** the handler's work and "store the response" commit in the **same database transaction**.
So "money moved" and "response saved" happen together or not at all. A crash can't leave "money moved, but a replay
would pay again".

Request hash = SHA-256 of `route + canonical JSON` (keys sorted), so `{a,b}` and `{b,a}` match.

### 4. Payment intent (merchant side)
The merchant creates an intent first; the QR (Day 3) only carries a reference to it.
Shared transition table in `packages/shared/src/state/paymentIntent.ts`, used by the API before every status update:

```
awaiting_scan (expires in 5 min) → scanned → paid → partially_refunded → refunded
       ↘ expired | cancelled         ↘ expired | cancelled
```

### 5. Payment attempt (consumer side)
`packages/shared/src/state/paymentAttempt.ts`: a pure reducer, ready for the app on Day 3:
```
idle → scanned → confirming → authorising → submitting → checking → paid
                                                       ↘ not_charged | failed | expired | insufficient_balance
```
`checking` is the important one: "I sent it, I don't know the outcome yet, and I won't guess."
A test proves there's **no path from `submitting`/`checking` to a new idempotency key**. The only way back to
`submitting` is `KEY_NOT_FOUND`, and it keeps the same key.

### 6. PaymentRail interface
```ts
interface PaymentRail {
  readonly name: string;
  submit(transfer: { id; amountCents; debtorAccount; creditorAccount }): Promise<RailResult>;
}
type RailResult =
  | { state: 'settled'; railReference: string; settledAt: Date }
  | { state: 'rejected'; reason: string };
```
`SimulatedSepaInstantRail` implements it. Chaos modes (`apps/api/src/rail/chaos.ts`):

| Mode | Behaviour |
|---|---|
| `ok` | Settle normally |
| `slow` | Settle after a delay |
| `reject` | The rail rejects |
| `drop_after_settle` | Settle and commit, then destroy the socket with no response |
| `insufficient` | Force insufficient balance |

### 7. Row locking
Inside the payment transaction: `SELECT … FOR UPDATE` on the **intent** (so two payers can't pay one intent) and on the
**payer's account** (so two payments from one wallet serialise), then check the balance, then post.

### 8. Plans as feature gates (from zysygy.de/plans)
`packages/shared/src/plans.ts`. The API already enforces them:

| Plan | Features |
|---|---|
| Free | static QR only |
| Pro | + dynamic QR, refunds, tips, staff roles |
| Business | + catalogue, CSV export, daily settlement |

So **Döner Ali (Free) gets `403 plan_required`** when creating a dynamic QR.

---

## What was built

### A. Monorepo ✅
- [x] Root `package.json`; pnpm **11** workspace (`pnpm-workspace.yaml`):
  - [x] `nodeLinker: hoisted`
  - [x] `allowBuilds: { esbuild: true }`
  - [x] `verifyDepsBeforeRun: false`
- [x] Turborepo `turbo.json`: `build`, `typecheck`, `test`, `dev`
- [x] Biome `biome.json`: 2-space indent, single quotes, line width 110, `noConsole` is an error
- [x] `tsconfig.base.json`: `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- [x] `docker-compose.yml`: Postgres 17-alpine + healthcheck; `scripts/init-test-db.sql` creates `zahln_test`
- [x] `.env.example`, copied to `.env` (git-ignored)

### B. `packages/shared` ✅
- [x] `money.ts`: `formatMoney`, `applyKeypadKey` (cents-first), `includedVat`, `sumCents`, `assertCents`
- [x] `schemas/index.ts`: Zod 4 schemas for intents, attempts, refunds, wallets, remote config, API errors
- [x] `state/paymentAttempt.ts`: consumer reducer (pure; illegal events are ignored, never thrown)
- [x] `state/paymentIntent.ts`: transition table + `statusAfterRefund` + `tillReducer` for the Day 3 till
- [x] `plans.ts`: plans → features, `hasFeature`, `minimumPlanFor`
- [x] `tokens/index.ts`: Quittung colours (light + dark), spacing, radius, type scale, motion, `contrastRatio()`
- [x] `i18n/de.json`, `i18n/en.json`: payment statuses, explanations ("Kein Geld abgebucht."), till strings
- [x] 65 Vitest tests, including **WCAG AA contrast for every text token pair in both themes** and "de and en have the same keys"

### C. `apps/api` ✅
- [x] Fastify 5 + `fastify-type-provider-zod` 7; pino logs with redaction (`x-user-id`, `authorization`, IBAN, balances)
- [x] Drizzle schema (`src/db/schema.ts`), 12 tables:
  - `users`, `merchants` (plan, handle, `receipt_seq`), `staff` (owner/manager/staff), `catalogue_items`
  - `accounts`, `ledger_transactions`, `postings`
  - `payment_intents`, `payment_attempts`, `refunds`
  - `idempotency_keys`, `events` (the timeline for the Day 5 console)
- [x] Migrations `0000_init.sql` (generated) + `0001_ledger_rules.sql` (hand-written triggers)
- [x] Seed (`src/db/seed.ts`):

  | Who | Role / plan | Starting state |
  |---|---|---|
  | Lena | student | 50,00 € |
  | Jonas | student | 10,00 € |
  | Café Mila | **Business**; owner Mila, staff Tom | the zysygy.de catalogue |
  | Mensa Augsburg | Business; manager Sabine | Mensa catalogue |
  | Döner Ali | **Free**; owner Ali | — |

- [x] Auth stub: `x-user-id` header (Day 2 replaces it with device-bound sessions)
- [x] Ledger (`src/lib/ledger.ts`): `postTransaction`, `balanceOf`, `lockAccount`
- [x] Payments (`src/lib/payments.ts`): `createIntent`, `payIntent`, `refundIntent`, `topUp`, `getWallet`
- [x] Gapless receipt numbers per merchant (`receipt_seq` incremented inside the payment transaction)
- [x] Expiry is checked **inside** the payment transaction using the database clock (`expires_at <= now()`)

### D. Routes

| Method + path | Who | Idempotent | Notes |
|---|---|---|---|
| `GET /health` | anyone | — | |
| `POST /merchants/:id/intents` | staff of merchant | ✅ | `{items:[{sku,qty}]}` (Business) or `{amountCents}`; needs `dynamic_qr` (Pro+) |
| `GET /intents/:id` | signed-in user | — | what the consumer sees after scanning |
| `POST /intents/:id/pay` | consumer | ✅ | `{tipCents?}` (tips need Pro+); 201 with `{attempt, intent}`; 409 `intent_expired` / `intent_not_payable` |
| `GET /attempts/by-key/:key` | consumer | — | reconciliation: "what happened to my request?" 404 = never arrived |
| `POST /intents/:id/refunds` | owner/manager | ✅ | `{amountCents, reason}`; partial refunds add up |
| `GET /wallets/me` | consumer | — | balance + last 20 transactions |
| `POST /wallets/me/topups` | consumer | ✅ | mock top-up |
| `GET /merchants/:id/wallet` | staff | — | |
| `GET /config` | anyone | — | stub, real on Day 5 |
| `GET/POST /dev/chaos`, `POST /dev/reset` | dev only | — | only when `CHAOS_ENABLED=true` |

### E. Tests (29 in the API, against a real Postgres `zahln_test`) ✅
After **every** test, a hook asserts that no ledger transaction is unbalanced.
- [x] A cart is priced on the server (6,30 €), the TTL is 5 minutes, and staff can create intents
- [x] Free merchant → `plan_required`; non-staff → 403; floats → 400; missing key → 400
- [x] Pay moves money; receipt numbers go 1, 2, …
- [x] **Replay with the same key → identical response, `idempotent-replayed: true`, charged once**
- [x] Same key + different body → 422
- [x] Second payer with a new key → 409, not charged
- [x] Insufficient balance → recorded, nothing moves, and the intent stays payable
- [x] Rail reject → `not_charged`
- [x] Expired intent → 409, marked `expired`, no postings
- [x] Tips go to the merchant
- [x] **Concurrency:** two simultaneous 7,00 € payments from a 10,00 € wallet → exactly one `paid`
- [x] **Concurrency:** two people paying the same intent → exactly one pays
- [x] **Concurrency:** the same request fired twice at once → charged once
- [x] **drop_after_settle:** no response → `GET /attempts/by-key` says `paid` → a replay returns `paid` → charged once
- [x] Unknown key → 404 (safe to resend with that key)
- [x] Refunds: partial + partial = full; then rejected; can't exceed the payment; staff can't refund; two simultaneous refunds can't over-refund
- [x] Database triggers: an unbalanced transaction is rejected at commit; `UPDATE`/`DELETE` on postings is rejected

The suite was run 5 times in a row to check that the concurrency tests aren't flaky.

---

## Files created
```
package.json  pnpm-workspace.yaml  turbo.json  biome.json  tsconfig.base.json  docker-compose.yml  .env.example
scripts/init-test-db.sql
packages/shared/src/{index.ts, money.ts, plans.ts, schemas/index.ts, state/paymentAttempt.ts,
                     state/paymentIntent.ts, tokens/index.ts, i18n/{de.json,en.json,index.ts}}
packages/shared/test/{money,paymentAttempt,paymentIntent,plans-tokens}.test.ts
apps/api/{package.json, tsconfig.json, drizzle.config.ts, vitest.config.ts}
apps/api/drizzle/{0000_init.sql, 0001_ledger_rules.sql, meta/}
apps/api/src/{app.ts, server.ts, env.ts}
apps/api/src/db/{client.ts, schema.ts, migrate.ts, seed.ts}
apps/api/src/lib/{errors.ts, idempotency.ts, ledger.ts, payments.ts}
apps/api/src/plugins/auth.ts
apps/api/src/rail/{types.ts, chaos.ts, simulatedSepaInstant.ts}
apps/api/src/routes/index.ts
apps/api/test/{globalSetup.ts, helpers.ts, payments.test.ts, idempotency.test.ts}
```

## Commands
```bash
cp .env.example .env
pnpm db:up
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm test
pnpm typecheck
pnpm lint
pnpm api
```

### End-to-end with curl
Create an intent as Mila (6,30 €):
```bash
curl -s -X POST localhost:4000/merchants/cafe-mila/intents -H 'x-user-id: usr_mila' -H "idempotency-key: $(uuidgen)" -H 'content-type: application/json' -d '{"items":[{"sku":"cappuccino","qty":1},{"sku":"croissant","qty":1}]}'
```

Pay it as Lena (replace `<intent-id>`; run it twice with the same key to see the replay):
```bash
curl -s -i -X POST localhost:4000/intents/<intent-id>/pay -H 'x-user-id: usr_lena' -H 'idempotency-key: 11111111-1111-4111-8111-111111111111' -H 'content-type: application/json' -d '{}'
```

Check Lena's balance (4.370 cents after paying):
```bash
curl -s localhost:4000/wallets/me -H 'x-user-id: usr_lena'
```

Turn on the worst case (money moves, response dropped):
```bash
curl -s -X POST localhost:4000/dev/chaos -H 'content-type: application/json' -d '{"mode":"drop_after_settle"}'
```

Ask what happened to a request:
```bash
curl -s localhost:4000/attempts/by-key/11111111-1111-4111-8111-111111111111 -H 'x-user-id: usr_lena'
```

Reset the demo data and chaos:
```bash
curl -s -X POST localhost:4000/dev/reset
```

Verified output from the real run: pay → `"status":"paid"`; replay → `201` + `idempotent-replayed: true`;
different body → `idempotency_key_reused`; Lena 4.370, Café Mila 630; Döner Ali → `plan_required`;
`drop_after_settle` → curl exits with "empty reply" (52), `by-key` shows `paid`, and a replay returns `paid`.

---

## Deviations from the plan
| Planned | Actual | Why |
|---|---|---|
| `.npmrc` with `node-linker=hoisted` | `nodeLinker: hoisted` in `pnpm-workspace.yaml` | pnpm 11 reads settings from the workspace file |
| — | `allowBuilds: { esbuild: true }` | pnpm 11 blocks install scripts by default (supply-chain safety); only esbuild may run one |
| — | `verifyDepsBeforeRun: false` | pnpm 11 auto-runs install before scripts, which hung on an interactive prompt |
| Café Mila on Pro | Café Mila on **Business** | The product catalogue is a Business feature on zysygy.de/plans. **Act 3's Free → Pro switch now uses Döner Ali.** PLAN.md and DAY-5.md are updated. |
| Keypad `,` key | `00` key | Entry is cents-first, so a comma key isn't needed. DESIGN_SYSTEM.md is updated. |
| Generic Fastify idempotency hooks | `withIdempotency(db, …, handler)` wrapper | The response must be stored **in the same transaction** as the money movement; hooks run outside it |
| Ledger checks in app code | App code **and** database triggers | Stronger guarantee, and a good interview point |
| Expiry returns a 409 via a thrown error | `payIntent` returns `{kind:'expired'}` | Throwing would roll back the `expired` status update |
| `GET /attempts/:id` | `GET /attempts/by-key/:key` | The client knows its key, not the server's attempt ID, when the response was lost |
| — | Added early: tips, top-ups, merchant wallet, `/dev/reset` | Small, and Days 3–4 need them |

### Simplifications to mention honestly in the interview
1. **The rail call happens inside the database transaction.** That's fine for an in-process simulator. With a real PSP
   (an external HTTP call) you'd: reserve funds and record the attempt as `processing` → commit → call the PSP with
   the attempt ID as the end-to-end reference → settle via webhook/polling with an **outbox** → post the ledger.
   Never hold a DB lock across a network call to a third party.
2. **Auth is a header stub** (`x-user-id`). Day 2 adds device-bound sessions.
3. **The idempotency "stale after 30 s" takeover** assumes requests time out at 15 s (`requestTimeout`). In
   production you'd also keep a lease/heartbeat.
4. **Events are written to a table but not yet pushed** to clients; Day 3 adds SSE after commit.

## Done when
- [x] `pnpm test` is green, including the concurrency tests (94 tests)
- [x] The `curl` flow works: create intent → pay → Lena −6,30 €, Café Mila +6,30 €
- [x] Re-running the pay `curl` with the same key returns the same body and the balances don't change
- [ ] You can draw the ledger tables and the two state machines from memory ← **your homework tonight**

## Interview drill
1. "Why is an automatic retry on a payment dangerous, and how do idempotency keys fix it?"
   *Point to: `withIdempotency` storing the response in the same transaction as the postings.*
2. "Why double-entry instead of a `balance` column?"
   *Point to: the deferred trigger that rejects unbalanced transactions at commit.*
3. "How do you stop two simultaneous payments from overdrawing a wallet?"
   *Point to: `lockAccount` (`FOR UPDATE`) + the concurrency test.*
4. "Why integer cents?"
5. "What does your `PaymentRail` interface buy you, and what changes with a real PSP?"
   *Point to: the outbox simplification above.*
6. "What happens if the server crashes between moving money and answering?" *(new)*
   *The commit includes the stored response; if the commit didn't happen, no money moved and the key is
   re-claimable after 30 s.*

## Commit
```
feat: day 1 foundations: monorepo, shared package, payments API with ledger and idempotency
```
