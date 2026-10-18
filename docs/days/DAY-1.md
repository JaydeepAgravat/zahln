# Day 1: Foundations (monorepo, shared package, API, ledger)

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
cents; format only at the edge with `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.

### 2. Double-entry ledger
Every money movement is a **transaction** made of **postings** that sum to zero.

```
Payment €6,30, consumer → merchant
  posting  consumer_wallet   −630
  posting  merchant_wallet   +630
  sum = 0  ✓
```

A balance is `SUM(postings.amount) WHERE account_id = X`. It's never a column you `UPDATE`. Why: an audit trail
for free, no lost updates, and GoBD-style "you can't silently change history". Refunds are *new* postings, never
edits.

Accounts in the MVP:
- `consumer_wallet:<userId>`
- `merchant_wallet:<merchantId>`
- `topup_source` (where mock top-ups come from)
- `settlement_outbound` (end-of-day payout to the merchant's bank)

### 3. Idempotency keys
The client generates a UUID **before** sending a money-moving request and sends it as `Idempotency-Key`.
The server stores `(key, request_hash, status, response)`:

| Situation | Server does |
|---|---|
| First time | Process, store the response, return it |
| Same key + same body | Return the stored response; **do not process again** |
| Same key + different body | `422`: the client has a bug |
| Same key, still processing | `409`: "in progress, ask again" |

This is what makes "the wifi dropped, did it go through?" answerable without charging twice.

### 4. Payment intent (merchant side)
The merchant creates an intent first; the QR only carries a reference to it.

```
draft → awaiting_scan (expires in 5 min) → scanned → paid
                         ↘ expired            ↘ cancelled
paid → partially_refunded → refunded
```

### 5. Payment attempt (consumer side)
```
idle → scanned → confirming → authorising → submitting → checking → paid
                                                         ↘ not_charged | failed | expired | insufficient_balance
```
`checking` is the important one: "I sent it, I don't know the outcome yet, and I won't guess."

### 6. PaymentRail interface
```ts
interface PaymentRail {
  submit(transfer: { id: string; amountCents: number; from: string; to: string }): Promise<RailResult>;
  status(id: string): Promise<RailResult>;
}
type RailResult = { state: 'settled' | 'rejected' | 'pending'; reason?: string; settledAt?: string };
```
`SimulatedSepaInstantRail` implements it, with chaos modes. A real PSP would implement the same interface later.

### 7. Row locking
Inside the payment transaction: `SELECT … FROM accounts WHERE id = $payer FOR UPDATE`, then check the balance, then
insert postings. Two concurrent payments from the same wallet are serialised, so the balance can't go negative.

---

## Tasks

### A. Monorepo (≈1 h)
- [ ] Root `package.json`, `pnpm-workspace.yaml`, `.npmrc` (`node-linker=hoisted`) (already exist)
- [ ] Add Turborepo: `turbo.json` with `typecheck`, `test`, `build`, `dev` pipelines
- [ ] Add Biome at the root: `biome.json` (formatter + linter, 2-space indent, single quotes)
- [ ] `tsconfig.base.json` with `strict: true`, `noUncheckedIndexedAccess: true`
- [ ] `docker-compose.yml` with Postgres 17 (port 5432, volume, healthcheck)
- [ ] `.env.example` with `DATABASE_URL`, `PORT=4000`, `CHAOS_ENABLED=true`

### B. `packages/shared` (≈2 h)
- [ ] `money.ts`: `Cents` type, `formatEUR(cents, locale)`, `parseKeypadInput()`
- [ ] `schemas/`: Zod schemas for `CreateIntentRequest`, `PaymentIntent`, `PayRequest`, `PaymentAttempt`,
      `Refund`, `RemoteConfig`, `ApiError`
- [ ] `state/paymentAttempt.ts`: typed reducer `(state, event) => state` with discriminated unions
- [ ] `state/paymentIntent.ts`: same for the merchant intent
- [ ] `plans.ts`: `free | pro | business` → feature list (`dynamic_qr`, `refunds`, `tips`, `staff_roles`, `catalogue`, `csv_export`)
- [ ] `tokens/`: the Quittung tokens from DESIGN_SYSTEM.md as TypeScript (light + dark), so they're ready for Day 2
- [ ] `i18n/de.json`, `i18n/en.json`: start with status strings (Bezahlt, Wird geprüft, Nicht belastet, Abgelaufen)
- [ ] Vitest tests: every legal transition, and illegal ones throw or no-op

### C. `apps/api` (≈3 h)
- [ ] Fastify 5 + `fastify-type-provider-zod`, CORS, pino logger with a redaction list (`authorization`, `iban`, `balance`)
- [ ] Drizzle schema:
  - [ ] `users`, `merchants` (plan, handle), `staff` (role: `staff | manager`)
  - [ ] `accounts`, `ledger_transactions`, `postings`
  - [ ] `payment_intents`, `payment_attempts`, `refunds`
  - [ ] `idempotency_keys`, `events` (for timelines)
- [ ] Migrations + `seed.ts`:
  - [ ] Café Mila (Pro) with the catalogue from the site: Cappuccino 3,80, Croissant 2,50, Matcha Latte 4,50, Espresso 2,20, Avocado Toast 7,50, Flat White 3,50
  - [ ] Mensa Augsburg (Business)
  - [ ] Döner stand (Free)
  - [ ] Student "Lena" with a 50,00 € balance
- [ ] Idempotency middleware (a Fastify `preHandler` + `onSend` hook) for routes marked `{ idempotent: true }`
- [ ] Routes:
  - [ ] `POST /merchants/:id/intents`: create an intent (amount, line items, 5-min expiry) (idempotent)
  - [ ] `GET  /intents/:id`: public view (merchant name, amount, status), used after scanning
  - [ ] `POST /intents/:id/pay`: consumer pays (idempotent, balance check, rail submit, postings)
  - [ ] `GET  /attempts/:id`: status for reconciliation
  - [ ] `GET  /wallets/me`: balance + recent transactions
  - [ ] `POST /intents/:id/refunds`: full or partial (idempotent, manager only)
  - [ ] `GET  /config`: stub for now (filled in on Day 5)
- [ ] `SimulatedSepaInstantRail` with modes: `ok`, `slow` (3–8 s), `reject`, `drop_after_settle`
      (settles, then the HTTP response is never sent)
- [ ] Expiry: an intent past `expires_at` can't be paid (checked in the transaction, not only by a cron job)

### D. Tests (≈1 h)
- [ ] Every ledger transaction sums to zero (a test helper that checks after each test)
- [ ] Paying twice with the same key → one posting pair, same response
- [ ] Same key, different body → 422
- [ ] Two concurrent payments that together exceed the balance → exactly one succeeds
- [ ] Refunds can't exceed the paid amount (cumulative partial refunds)
- [ ] Paying an expired intent → `expired`, no postings

---

## Files you'll create
```
turbo.json  biome.json  tsconfig.base.json  docker-compose.yml  .env.example
packages/shared/src/{money.ts, plans.ts, schemas/*, state/*, tokens/*, i18n/*}
packages/shared/test/*.test.ts
apps/api/src/{server.ts, db/schema.ts, db/seed.ts, plugins/idempotency.ts, rail/*.ts, routes/*.ts, ledger.ts}
apps/api/test/*.test.ts
```

## Commands
```bash
docker compose up -d
pnpm install
pnpm --filter @zahln/api db:migrate && pnpm --filter @zahln/api db:seed
pnpm test
pnpm api
```

End-to-end check:
```bash
curl -s -X POST localhost:4000/merchants/cafe-mila/intents -H 'Idempotency-Key: 11111111-1111-4111-8111-111111111111' -H 'content-type: application/json' -d '{"items":[{"sku":"cappuccino","qty":1},{"sku":"croissant","qty":1}]}'
```

## Pitfalls
- **Floats sneaking in** through `Number(req.body.amount)` / `parseFloat`. The Zod schema should demand `z.number().int().nonnegative()`.
- **Idempotency stored after the side effect, in a separate transaction.** If the process dies in between, a replay pays
  twice. Insert the key row (status `processing`) at the start, in the same database transaction as the postings where you can.
- **Hashing the body inconsistently** (key order). Hash a canonical JSON string.
- **Time zones:** store `timestamptz`, compare in the database (`now()`), not with the server's clock in JS.
- **Overbuilding auth:** today a fake `x-user-id` header is fine. Real auth comes on Day 2.

## Done when
- [ ] `pnpm test` is green, including the concurrency test
- [ ] The `curl` flow works: create intent → pay → wallet shows −6,30 € for Lena, +6,30 € for Café Mila
- [ ] Re-running the pay `curl` with the same key returns the same body and the balances don't change
- [ ] You can draw the ledger tables and the two state machines from memory

## Interview drill
1. "Why is an automatic retry on a payment dangerous, and how do idempotency keys fix it?"
2. "Why double-entry instead of a `balance` column?"
3. "How do you stop two simultaneous payments from overdrawing a wallet?"
4. "Why integer cents?"
5. "What does your `PaymentRail` interface buy you?"

## Commit
```
chore: monorepo with pnpm, turbo, biome and postgres
feat(shared): money utils, zod schemas, payment state machines, plans, tokens
feat(api): ledger, idempotency, payment intents and simulated SEPA Instant rail
test(api): ledger balance, idempotent replay, concurrency, refunds
```
