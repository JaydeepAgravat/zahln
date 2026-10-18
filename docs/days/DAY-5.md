# Day 5: When things go wrong (Act 2)

## Goal
"Kill the network after the money moved and the app never lies and never double-charges. It shows Wird geprüft
and resolves to Bezahlt or Nicht belastet. Every other state (insufficient balance, expired, rejected) has its own
honest screen. Static @handle QR codes, tips and refunds work too."

## Why it matters for the interview
- JD: *"Campus wifi will drop a request after the money has already moved. How the app behaves in that second is a
  design decision, and it is yours."* Today you make that decision.
- JD: *"Pending, failed, expired, insufficient balance, refunded, disputed. Asked to describe a payment screen, you describe all of them."*
- Site: *"If the connection drops during a transaction, the app holds the payment and confirms it when the connection returns."*
- This is **Act 2**, the act that wins the interview.

---

## Concepts to understand first

### 1. The three outcomes of a timed-out request
When `POST /pay` times out, the client **does not know** which of these happened:
1. The request never reached the server → nothing happened.
2. The server processed it and the response got lost → **money moved**.
3. The server is still processing.

So the only honest UI is **"Wird geprüft"** (checking), followed by reconciliation, *never* "failed", and *never* an automatic re-POST
with a new key.

### 2. Reconciliation loop
```
on timeout / network error:
  state → checking
  repeat with backoff (0.5s, 1s, 2s, 4s… cap 8s, total ≤ 60s):
    GET /attempts/by-key/<idempotencyKey>      (or re-POST with the SAME key; the server replays)
    if paid        → paid
    if rejected    → not_charged
    if not found   → (request never arrived) → safe to offer "Erneut versuchen" (try again) with the SAME key
  after 60s: "Wir prüfen noch" (we're still checking) + push notification when resolved; the receipt appears in history
```
If the network comes back, `NetInfo` triggers an immediate check. The app is killed mid-check → on next launch, the persisted
pending key is found and the check resumes.

### 3. The honest version of "offline payments"
On account-to-account rails there's no card network guarantee. A merchant can't know the customer has the money while
offline. Options:
- **Online-only + fast reconciliation** (MVP): the till shows *Wird geprüft*, never green until the server confirms.
- **Offline queue with merchant risk**: hand over the coffee and accept the risk under a small limit (like card offline floor limits).
- **Pre-authorised offline tokens**: the wallet reserves a small balance in advance and signs offline tokens. This is how CBDC/offline-wallet
  designs work, and it's complex.

This goes in ADR 2. Ask them in the interview which one they mean.

### 4. Chaos modes (dev only)
Controlled from `POST /dev/chaos` (and the console on Day 6):
- `drop_after_settle`: settle, then destroy the socket without responding
- `reject`: the rail rejects
- `slow`: 3–8 s latency
- `insufficient`: force insufficient funds

### 5. Static QR / @handle (Free plan)
The QR encodes `https://pay.zahln.de/@doener-ali`. There's no amount, so the **consumer types it**, and the merchant sees the payment arrive. Fraud
consideration: the verified merchant name and a photo come from the server.

### 6. Refund rules
- Manager only (re-auth with biometrics)
- Partial refunds add up and can never exceed the original amount
- Each refund is an idempotent request and a new ledger transaction (merchant −, consumer +)
- States: `paid → partially_refunded → refunded`

---

## Tasks

### A. Error-state UI (≈2 h)
- [ ] One `PaymentOutcome` screen driven by the reducer state:
  - [ ] Bezahlt (paid)
  - [ ] Wird geprüft (checking)
  - [ ] Nicht belastet (not charged)
  - [ ] Abgelaufen (expired)
  - [ ] Guthaben reicht nicht (insufficient balance: show the balance + "Aufladen" (top up))
  - [ ] Fehlgeschlagen (failed: unknown error, still says whether money moved)
- [ ] Copy rule: every screen answers **"what happened to my money?"** in the first line
- [ ] The merchant till mirrors these: it never shows green during `checking`, and shows "Kunde zahlt noch…" (customer is still paying)
- [ ] Haptics per status (success / warning / error)

### B. Reconciliation (≈2 h)
- [ ] API: `GET /attempts/by-key/:key`
- [ ] Mobile: a `useReconcile(key)` hook with backoff, a NetInfo trigger, and a cap
- [ ] Persist pending attempts (key + intent + startedAt) so they survive an app kill; resume on launch
- [ ] Unit tests for the reducer: `timeout → checking → paid`, `checking → not_charged`, and that there's no path from `checking → submitting` with a new key

### C. Chaos (≈1 h)
- [ ] `POST /dev/chaos { mode }` (disabled unless `CHAOS_ENABLED=true`)
- [ ] `drop_after_settle` implemented as `reply.raw.destroy()` after the commit
- [ ] A dev menu in the app to set chaos quickly (until the console exists)

### D. Static QR, tips, refunds (≈2 h)
- [ ] Merchant "Mein QR" (my QR) screen with the @handle QR (always available, Free plan)
- [ ] Consumer handle flow: scan → merchant profile → enter amount → confirm
- [ ] Tips: after the cart, the consumer optionally picks 0 / 5 / 10 % / custom (Pro feature, gated on Day 6)
- [ ] Refunds: transaction detail → "Erstatten" (refund) → full/partial amount → manager re-auth → done; the consumer receipt shows the
      refund
- [ ] History (FlashList): search by merchant, filter by status, sticky day headers, badges for anything other than paid

---

## Files you'll create
```
apps/api/src/routes/{dev.ts, attempts.ts}  apps/api/src/rail/chaos.ts
packages/mobile-core/src/payments/{useReconcile.ts, pendingStore.ts}
packages/mobile-ui/src/PaymentOutcome.tsx
apps/consumer/src/features/{HandlePayScreen, HistoryScreen, TransactionDetailScreen}.tsx
apps/merchant/src/features/{MyQRScreen, RefundSheet}.tsx
packages/shared/test/reconcile.test.ts
```

## Pitfalls
- **"Erneut versuchen" creating a new idempotency key.** The same attempt means the same key. A new key only comes when the user
  starts a *new* payment.
- **Showing a spinner forever.** Cap at 60 s and then explain in words what happens next.
- **Treating 5xx as "not charged".** A 5xx after processing started is still unknown → `checking`.
- **Refund race:** two managers refunding at the same time → lock the intent row (`FOR UPDATE`) and test it.
- **Red for outgoing money in history.** Outgoing money isn't an error. Use text-primary (DESIGN_SYSTEM.md).

## Done when
- [ ] **Act 2 works:** chaos `drop_after_settle` → app shows Wird geprüft → resolves to Bezahlt within ~2 s; the ledger
      shows exactly one payment
- [ ] Chaos `reject` → Nicht belastet, and the balance is unchanged
- [ ] Turn the simulator's network off mid-payment, wait, and turn it back on → it resolves correctly
- [ ] Killing the app during `checking` and reopening it resumes the check
- [ ] A partial refund of 2,50 € then 3,80 € → refunded; a third refund is rejected

## Interview drill
1. "The request timed out. Did the payment go through? What does your app show, and why?" (Say all three cases.)
2. "Why is a 5xx not the same as a failure?"
3. "Our website promises offline payments. How would you build that, and what's the risk?"
4. "Describe every state of a payment screen." (Recite them all.)
5. "How do you stop two refunds racing each other?"

## Commit
```
feat(mobile): payment outcome states and haptics
feat(mobile): reconciliation with backoff that survives app kill
feat(api): chaos modes for the rail simulator
feat: static handle QR, tips, partial refunds and history
test(shared): reconciliation never re-submits with a new key
```
