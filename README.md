# Zahln

**Pay at the counter with your phone, straight from one bank account to another. No card, no terminal, no fees.**

![A payment in six steps: the café rings up €6.30, a one-time QR code appears, the student scans it, confirms with a PIN, sees "Paid", and the café's till turns green.](docs/screenshots/payment-story.png)

This repository is a working prototype of **Zahln**, a payment app for students, and **ZYSYGY**, the till app for the
shops where they pay. I am a mobile app developer, and I built it to learn German fintech from the inside: how
money really moves between bank accounts, what German law asks of a till and a receipt, and how to make a payment
app that never charges twice. The product idea comes from [Zahln / ZYSYGY](https://zysygy.de). The bank behind
this prototype is simulated, so no real money moves. Everything else is real and runs end to end: two phone apps,
three websites, and the server that connects them.

<table>
<tr>
<td valign="top" width="50%">

**New here? Read this way.**

- **Not technical?** Read [The story](#the-story) and [Three moments](#three-moments-that-matter), then look at [every screen](#every-screen). About 5 minutes.
- **Developer?** Start with [How it works](#how-it-works), then [Run it yourself](#run-it-yourself) and [the handbook](docs/HANDBOOK.md).
- **Unknown word?** The [glossary](#glossary) explains every term in one line.

</td>
<td valign="top">

**Contents**

1. [The story](#the-story)
2. [Three moments that matter](#three-moments-that-matter)
3. [Five apps, one product](#five-apps-one-product)
4. [What is real and what is simulated](#what-is-real-and-what-is-simulated)
5. [How it works](#how-it-works)
6. [Run it yourself](#run-it-yourself)
7. [How we know it works](#how-we-know-it-works)
8. [Every screen](#every-screen)
9. [Glossary](#glossary)
10. [More to read: the handbook](#more-to-read)

</td>
</tr>
</table>

## The story

**Meet Mila.** She runs Café Mila in Augsburg, a small café near the university. Many of her customers pay by card.
Every card payment costs her a fee, and the card terminal costs money too. For a €3.80 cappuccino, those costs
take a real part of what she earns.

**Meet Lena.** She studies at the university and buys coffee at Café Mila most mornings. She wants paying to be
fast and simple, and she wants to be sure that she never pays twice by mistake.

**Zahln connects them.** Mila's phone becomes her till: she opens the **ZYSYGY** app, taps what Lena ordered, and a
QR code appears. Lena scans it with the **Zahln** app, checks the amount, and confirms with her PIN or Face ID.
The money moves from Lena's account to Mila's account through **SEPA Instant**, the European system that
moves euros between bank accounts in seconds. No card network sits in between, so there is no fee on the payment.
Shops pay a monthly plan for extra features instead (Free, Pro at €29, Business at €59).

The whole payment takes about three seconds. In this prototype the bank confirms in under half a second.

## Three moments that matter

A payment app must do three things well. Each one is built and works in this prototype. Each one is also a short live demo.

### 1. Paying takes three seconds

Mila taps a cappuccino and a croissant. The till shows a QR code that works **only once**, **only for €6.30**, and
**only for 5 minutes**. Lena scans it and confirms. Her phone says "Paid". At the same moment, Mila's till turns green,
her balance goes up, and the payment appears on her web dashboard. All of this happens live, with no refresh.

### 2. The internet drops, and nobody pays twice

This is the hardest problem in payments. Lena taps "Pay". The bank moves the money. But the café Wi-Fi drops
**before the answer reaches her phone**. What should the app say?

A careless app would say "Failed", and Lena would try again, so she pays **twice**. Zahln does something different:

<table>
<tr>
<td align="center" width="33%"><img src="docs/screenshots/zahln/16-checking.png" width="220" alt="Checking"><br><sub><b>Checking</b>: the app does not guess. It asks the bank what happened.</sub></td>
<td align="center" width="33%"><img src="docs/screenshots/zahln/13-paid.png" width="220" alt="Paid"><br><sub><b>Paid</b>: the bank says the money arrived. It was charged once.</sub></td>
<td align="center" width="33%"><img src="docs/screenshots/zahln/14-not-charged.png" width="220" alt="Not charged"><br><sub><b>Not charged</b>: the bank refused. The app says clearly that no money moved.</sub></td>
</tr>
</table>

How? Every payment carries a unique **ticket number** (developers call it an *idempotency key*). If the phone asks
twice with the same ticket, the server knows it is the same payment and answers with the first result. It never
charges twice. You can watch this happen: the ops console can "break" the network on purpose.

### 3. Changing the app without a new release

A phone app cannot be fixed instantly. Every update must pass the App Store review, and many people install it late.
So the important switches live on the server, and the team controls them from the **ops console**:

- **Upgrade a shop's plan:** Döner Ali moves from Free to Pro, and its till gets one-time QR codes within a second.
- **Turn a feature off:** if "Tap to Pay" has a problem, one switch hides it on every phone.
- **Retire an old version:** the team can raise the oldest version that still works. Old apps then show "Please update". The customers' money stays safe.

## Five apps, one product

| | App | Who uses it | What it does | Built with |
|---|---|---|---|---|
| <img src="docs/screenshots/zahln/07-wallet.png" width="60" alt=""> | **Zahln** (iOS, Android) | Students and shoppers | A wallet: pay a QR code, see your history and receipts | React Native |
| <img src="docs/screenshots/zysygy/03-till.png" width="60" alt=""> | **ZYSYGY** (iOS, Android) | Shop staff at the counter | A till: ring up, show a QR, refund, see today's takings | React Native |
| <img src="docs/screenshots/web/02-today.png" width="60" alt=""> | **Zahln Web** | Shop owners, and customers without the app | A dashboard for the shop, a web wallet, and a checkout page for payment links | Next.js |
| <img src="docs/screenshots/console/07-control-room.png" width="60" alt=""> | **Zahln Ops** | The Zahln support team | Find any payment, refund it, change plans, flip switches. Every action is logged | Vite + React |
| <img src="docs/screenshots/landing/01-edition.png" width="60" alt=""> | **The Zahln Edition** | Everyone, as a first impression | A landing page that tells the product story | Next.js |

All five share one design system called **"Ember and ink"**: warm paper, near-black ink, and one orange accent,
in light and dark mode. Everything works in **German and English**, and it works with screen readers.
See [the handbook](docs/HANDBOOK.md#317-text-and-design).

## What is real and what is simulated

Honesty matters when money is involved, so here is the exact line:

| Real, working code | Simulated or not built yet |
|---|---|
| Both phone apps on iOS and Android, sign-up with phone number and code, PIN and Face ID | The **bank** is simulated. It behaves like SEPA Instant: it confirms, it can be slow, it can refuse |
| One-time QR codes, payment links, static shop QR codes, tips, full and partial refunds | **SMS** is not sent. In development the code is always `123456` |
| A double-entry ledger, so every cent is accounted for and balances always add up | **German cash-register rules** (KassenSichV/TSE) are not connected |
| The "no double charge" protection, kill switches, plan features, forced updates | **App Store / Play Store** release, real certificate pins |
| Security: device binding, screenshot protection, log scrubbing, data export and account deletion (GDPR) | Payouts to a real bank account (the payout runs against the simulated bank) |
| Phone-to-phone NFC payment on Android (the till acts like a card) | NFC on iPhone (Apple allows it only with a special entitlement and payment-provider status; QR works on every phone) |

## How it works

```mermaid
flowchart LR
  Z["Zahln app (student)"] --> API
  Y["ZYSYGY app (shop till)"] --> API
  W["Zahln Web (dashboard, wallet, checkout)"] --> API
  C["Zahln Ops (support console)"] --> API
  API["API server (Fastify, TypeScript)"] --> DB["Postgres (double-entry ledger)"]
  API --> BANK["Bank rail (simulated SEPA Instant)"]
  API -. "live updates (SSE)" .-> Y
  API -. "live updates (SSE)" .-> W
```

One payment, step by step:

```mermaid
sequenceDiagram
  participant Till as ZYSYGY till
  participant API as API server
  participant App as Zahln app
  participant Bank as Bank (simulated)
  Till->>API: Create a payment for €6.30
  API-->>Till: One-time QR (signed, 5 minutes)
  App->>API: Scanned: what is this QR?
  API-->>App: Café Mila, €6.30, the items
  App->>API: Pay, with ticket number K (after PIN)
  API->>Bank: Move €6.30 from Lena to Mila
  Bank-->>API: Settled
  API-->>App: Paid
  API-->>Till: Paid (live update)
  Note over App,API: If the answer is lost, the app asks "what happened to ticket K?"<br/>The server answers with the first result. It never charges twice.
```

**The main ideas, for developers:**

- **One typed state machine for every payment**, shared by both apps and the web checkout. Every state (paying, checking, paid, not charged, not enough balance, expired) has its own screen and its own tests.
- **Idempotency keys on every request that moves money.** A repeated request returns the stored answer, and Postgres constraints allow only one paid attempt per payment.
- **A double-entry ledger.** Balances are sums of ledger rows. Database triggers reject any transaction that does not balance.
- **Server-driven config**: kill switches, plan features, re-authentication limits and minimum app versions. All of it changes live from the console and is audited.
- **Native code where it is needed:** two TurboModules, written in Swift and Kotlin. One protects sensitive screens from screenshots. The other turns an Android till into an NFC card.
- **One monorepo** with shared packages, so five front ends never drift apart:

```
apps/
  consumer/   Zahln app (bare React Native 0.88, iOS + Android)
  merchant/   ZYSYGY app (bare React Native 0.88, iOS + Android)
  api/        Fastify + Postgres + Drizzle, ledger, simulated bank rail
  web/        Zahln Web (Next.js 16): dashboard, web wallet, pay-link checkout
  console/    Zahln Ops (Vite + React + shadcn/ui)
  landing/    The Zahln Edition (Next.js 16, Lenis, Motion, OGL)
packages/
  shared/        schemas, payment state machines, money, plans, German/English text
  mobile-core/   API client, session, keychain, biometrics, logging
  mobile-ui/     the mobile design system and the screens both apps share
  web-ui/        the web design system
  secure-screen/ native module: screenshot protection, integrity hints
  nfc-pay/       native module: Android phone-to-phone payment
```

Every choice, its trade-offs and the alternatives are explained in [the handbook](docs/HANDBOOK.md).

## Run it yourself

You need: macOS with Xcode (for iOS) or Android Studio (for Android), Node.js 22 or newer, pnpm 11 and Docker.

```bash
cp .env.example .env
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed   # Postgres in Docker, with demo data
pnpm api                                        # the API server on :4000
```

Then start what you want to see, each in its own terminal:

| To see | Run | Then open |
|---|---|---|
| Zahln app | `pnpm pods` once, then `pnpm consumer` and `pnpm consumer:ios` (or `consumer:android`) | the simulator |
| ZYSYGY app | `pnpm merchant` and `pnpm merchant:ios` (or `merchant:android`) | the simulator |
| Zahln Web | `pnpm web` | http://localhost:3000 |
| Zahln Ops | `pnpm console` | http://localhost:5174 (your name + `ADMIN_TOKEN` from `.env`) |
| Landing page | `pnpm --filter @zahln/landing dev` | http://localhost:3001 |
| Storybook | `pnpm storybook` | http://localhost:6006 |

**Demo accounts** (the sign-in code is always `123456`, and the demo PIN is `271828`):

| Who | Phone number | Use in |
|---|---|---|
| Lena, a student | `0151 0000 0001` | Zahln, the web wallet, payment links |
| Mila, owner of Café Mila | `0151 0000 0010` | ZYSYGY, the Zahln Web dashboard |

On Android 16, allow "nearby devices" when a debug build first opens: Metro needs local-network access.

## How we know it works

| Check | What it covers | Run |
|---|---|---|
| Unit and API tests | Ledger, payments, idempotency, refunds, plans, security rules (Vitest, Jest) | `pnpm turbo run test` |
| Browser tests | Checkout, a lost connection in the browser, the dashboard, the console, with automatic accessibility checks in light and dark mode (Playwright + axe) | `pnpm e2e` |
| Phone tests | Pay a QR, survive a lost connection, the till from QR to "Paid" (Maestro, on the iOS simulator) | `pnpm e2e:mobile` |
| Design system | Every component in light and dark, German and English (Storybook) | `pnpm storybook` |
| Code quality | Lint and format (Biome), types (TypeScript), performance and accessibility budgets for the landing page (Lighthouse) | `pnpm biome ci .` |

One CI pipeline ([`ci.yml`](.github/workflows/ci.yml)) runs all of this on GitHub, except the phone tests, which need a Mac.

## Every screen
All 61 screens of the five front ends, captured from the running apps with demo data: Lena pays, Mila sells.
The phone shots come from the iPhone simulator, the web shots from Chrome. They are regenerated by
`pnpm screens:mobile` (Maestro) and `pnpm screens:web` (Playwright), then `scripts/screens/finish.sh <mobile png dir>`.

### Zahln: the student wallet (iOS and Android)
<table>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/01-welcome.png" width="200" alt="<b>Welcome</b>"><br><sub><b>Welcome</b>: what Zahln is in one line, with a language switch</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/02-phone.png" width="200" alt="<b>Phone number</b>"><br><sub><b>Phone number</b>: sign-up is a German mobile number, nothing else</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/03-code.png" width="200" alt="<b>Code</b>"><br><sub><b>Code</b>: the one-time SMS code (the dev build shows the demo code)</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/04-pin.png" width="200" alt="<b>Choose a PIN</b>"><br><sub><b>Choose a PIN</b>: six digits that guard payments and the app</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/05-biometrics.png" width="200" alt="<b>Face ID</b>"><br><sub><b>Face ID</b>: optional, the PIN stays as the fallback</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/06-lock.png" width="200" alt="<b>Lock</b>"><br><sub><b>Lock</b>: every launch starts here, PIN or Face ID</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/07-wallet.png" width="200" alt="<b>Wallet</b>"><br><sub><b>Wallet</b>: balance, the zero-fee promise and recent payments</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/08-history.png" width="200" alt="<b>History</b>"><br><sub><b>History</b>: every payment, refund and top-up, searchable and filtered</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/09-receipt.png" width="200" alt="<b>Receipt</b>"><br><sub><b>Receipt</b>: itemised with VAT, stored unchangeably (GoBD)</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/10-settings.png" width="200" alt="<b>Profile</b>"><br><sub><b>Profile</b>: language, theme, biometrics, sign out and "Your data" (GDPR)</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/11-pay.png" width="200" alt="<b>Pay</b>"><br><sub><b>Pay</b>: a till QR (or a pay link) opens the basket, with an optional tip</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/12-pin-sheet.png" width="200" alt="<b>Confirm</b>"><br><sub><b>Confirm</b>: the PIN sheet names the amount and the merchant</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/13-paid.png" width="200" alt="<b>Paid</b>"><br><sub><b>Paid</b>: the green flood and the time the bank took to confirm</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/14-not-charged.png" width="200" alt="<b>Not charged</b>"><br><sub><b>Not charged</b>: the bank refused, and the app says plainly that no money moved</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/15-insufficient.png" width="200" alt="<b>Not enough balance</b>"><br><sub><b>Not enough balance</b>: nothing charged, with a way to top up</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/16-checking.png" width="200" alt="<b>Checking</b>"><br><sub><b>Checking</b>: the answer got lost; the app asks the bank instead of guessing</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/17-handle.png" width="200" alt="<b>Static QR</b>"><br><sub><b>Static QR</b>: a merchant's permanent code, where the payer types the amount</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/18-update.png" width="200" alt="<b>Please update</b>"><br><sub><b>Please update</b>: ops can retire an old app version, money stays safe</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/19-wallet-dark.png" width="200" alt="<b>Wallet, dark</b>"><br><sub><b>Wallet, dark</b>: the same "Ember and ink" design in dark mode</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zahln/20-pay-dark.png" width="200" alt="<b>Pay, dark</b>"><br><sub><b>Pay, dark</b>: the checkout sheet in dark mode</sub></td>
</tr>
</table>

### ZYSYGY: the merchant till (iOS and Android)
<table>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/01-welcome.png" width="200" alt="<b>Welcome</b>"><br><sub><b>Welcome</b>: the phone becomes the till, no terminal needed</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/02-merchant.png" width="200" alt="<b>Your business</b>"><br><sub><b>Your business</b>: the signed-in number picks which shop this till serves</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/03-till.png" width="200" alt="<b>Till</b>"><br><sub><b>Till</b>: tap the catalogue to build the basket</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/04-keypad.png" width="200" alt="<b>Amount</b>"><br><sub><b>Amount</b>: or just type a price</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/05-qr.png" width="200" alt="<b>One-time QR</b>"><br><sub><b>One-time QR</b>: valid for this payment only, with a countdown</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/06-customer-reviewing.png" width="200" alt="<b>Customer is reviewing</b>"><br><sub><b>Customer is reviewing</b>: the till sees the scan live</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/07-paid.png" width="200" alt="<b>Paid</b>"><br><sub><b>Paid</b>: the money is in, receipt number shown, back to the till in 4 s</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/08-my-qr.png" width="200" alt="<b>My QR</b>"><br><sub><b>My QR</b>: the static code for the counter; customers type the amount</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/09-wallet.png" width="200" alt="<b>Wallet</b>"><br><sub><b>Wallet</b>: today's takings and every incoming payment</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/10-payment.png" width="200" alt="<b>Payment</b>"><br><sub><b>Payment</b>: one sale with its items, ready to refund</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/11-refund.png" width="200" alt="<b>Refund</b>"><br><sub><b>Refund</b>: amount and a reason, confirmed with the PIN (managers only)</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/12-settings.png" width="200" alt="<b>Profile</b>"><br><sub><b>Profile</b>: the signed-in staff member and the till's settings</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/13-till-dark.png" width="200" alt="<b>Till, dark</b>"><br><sub><b>Till, dark</b>: for evening shifts</sub></td>
<td align="center" valign="top" width="25%"><img src="docs/screenshots/zysygy/14-wallet-dark.png" width="200" alt="<b>Wallet, dark</b>"><br><sub><b>Wallet, dark</b>: takings in dark mode</sub></td>
</tr>
</table>

### Zahln Web: the merchant dashboard
<table>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/01-login.png" width="420" alt="<b>Sign in</b>"><br><sub><b>Sign in</b>: the merchant dashboard uses the same phone number and code</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/02-today.png" width="420" alt="<b>Today</b>"><br><sub><b>Today</b>: today's takings, counting up live as customers pay at the counter</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/03-transactions.png" width="420" alt="<b>Transactions</b>"><br><sub><b>Transactions</b>: every payment, searchable by amount or receipt number, filtered by till and date</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/04-receipt.png" width="420" alt="<b>Receipt</b>"><br><sub><b>Receipt</b>: any payment's receipt in a side sheet, with a refund button</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/05-payment-request.png" width="420" alt="<b>Payment request</b>"><br><sub><b>Payment request</b>: a link and QR for an amount, e.g. for catering</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/06-payouts.png" width="420" alt="<b>Payouts</b>"><br><sub><b>Payouts</b>: the nightly SEPA Instant payout to the shop's bank</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/07-team.png" width="420" alt="<b>Team</b>"><br><sub><b>Team</b>: who may sell, refund or manage</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/08-plan.png" width="420" alt="<b>Plan</b>"><br><sub><b>Plan</b>: Free, Pro and Business, and what each unlocks</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/09-export.png" width="420" alt="<b>Export</b>"><br><sub><b>Export</b>: a DATEV CSV for the tax adviser, one row per receipt</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/10-qr-poster.png" width="420" alt="<b>QR poster</b>"><br><sub><b>QR poster</b>: a printable stand for the counter</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/web/11-today-dark.png" width="420" alt="<b>Today, dark</b>"><br><sub><b>Today, dark</b>: the dashboard in dark mode</sub></td>
</tr>
</table>

### Zahln Web: pay link and web wallet (phone browser)
<table>
<tr>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/01-pay-link.png" width="260" alt="<b>Pay link</b>"><br><sub><b>Pay link</b>: a QR or link opened without the app shows the basket</sub></td>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/02-code.png" width="260" alt="<b>Sign in</b>"><br><sub><b>Sign in</b>: pay with the Zahln number and a one-time code</sub></td>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/03-paid.png" width="260" alt="<b>Paid</b>"><br><sub><b>Paid</b>: the same outcome screens as the app</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/04-invalid.png" width="260" alt="<b>Forged link</b>"><br><sub><b>Forged link</b>: a tampered or unknown link is refused, nothing to pay</sub></td>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/05-wallet.png" width="260" alt="<b>Web wallet</b>"><br><sub><b>Web wallet</b>: balance and history in the browser</sub></td>
<td align="center" valign="top" width="33%"><img src="docs/screenshots/checkout/06-devices.png" width="260" alt="<b>Devices</b>"><br><sub><b>Devices</b>: every signed-in phone and browser, each one revocable</sub></td>
</tr>
</table>

### Zahln Ops: the internal console
<table>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/01-login.png" width="420" alt="<b>Sign in</b>"><br><sub><b>Sign in</b>: the operator's name plus the ops token, so every action is attributed</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/02-payments.png" width="420" alt="<b>Payments</b>"><br><sub><b>Payments</b>: search by amount, merchant or reference</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/03-payment-detail.png" width="420" alt="<b>Payment</b>"><br><sub><b>Payment</b>: its timeline and the double-entry ledger rows behind it</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/04-refund.png" width="420" alt="<b>Refund</b>"><br><sub><b>Refund</b>: support refunds need an amount and a reason</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/05-merchants.png" width="420" alt="<b>Merchants</b>"><br><sub><b>Merchants</b>: plan, team size and today's takings</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/06-merchant.png" width="420" alt="<b>Merchant</b>"><br><sub><b>Merchant</b>: plan changes and the shop's recent payments</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/07-control-room.png" width="420" alt="<b>Control room</b>"><br><sub><b>Control room</b>: kill switches, minimum app versions, limits, simulated bank</sub></td>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/08-audit.png" width="420" alt="<b>Audit log</b>"><br><sub><b>Audit log</b>: who changed what, when and why</sub></td>
</tr>
<tr>
<td align="center" valign="top" width="50%"><img src="docs/screenshots/console/09-control-room-dark.png" width="420" alt="<b>Control room, dark</b>"><br><sub><b>Control room, dark</b>: the console in dark mode</sub></td>
</tr>
</table>

### The Zahln Edition: the landing page
<img src="docs/screenshots/landing/01-edition.png" width="860" alt="The Zahln Edition">
<br><sub><b>The Zahln Edition</b>: an Editions-style launch page for the product (<code>apps/landing</code>)</sub>

## Glossary

| Term | Meaning |
|---|---|
| **SEPA Instant** | The European system that moves euros between bank accounts in about 10 seconds or less, any time of day. |
| **Account-to-account (A2A)** | Money goes straight from the payer's bank account to the shop's. No card network sits in between. |
| **QR code** | A square barcode a phone camera can read. Here, each one stands for exactly one payment. |
| **Idempotency key** | A unique "ticket number" on a payment request. Sending the same ticket twice can never charge twice. |
| **Ledger (double-entry)** | The accounting book. Every payment is written twice, once as money out and once as money in, so the totals always balance. |
| **Kill switch** | A switch on the server that turns a feature off in every app at once, without an app update. |
| **Feature flag / plan** | A server setting that decides which features a shop gets (Free, Pro or Business). |
| **Forced update** | Old app versions are blocked and asked to update, for example after a security fix. |
| **NFC** | The short-range radio behind contactless cards. Here, the Android till can act like a card. |
| **GoBD / DATEV** | German rules for keeping business records, and the accounting format German tax advisers use. |
| **GDPR** | The EU privacy law. Users can export their data and delete their account in the app. |
| **React Native** | A way to build iPhone and Android apps from one codebase in TypeScript, with native code where needed. |
| **TurboModule** | A piece of native code (Swift or Kotlin) that a React Native app can call directly. |
| **Monorepo** | All apps and shared code in one repository, so a change to shared code updates every app. |
| **Simulator** | A virtual iPhone or Android phone on a computer, used for development and the screenshots here. |

## More to read

Everything else is in one document: **[The Zahln Handbook](docs/HANDBOOK.md)**. It tells the whole story:

1. [What problem this solves, and why](docs/HANDBOOK.md#part-1-the-problem-and-why-it-is-worth-solving)
2. [The hard parts](docs/HANDBOOK.md#part-2-the-hard-parts)
3. [The tech stack: why, the trade-offs, and when something else is better](docs/HANDBOOK.md#part-3-the-tech-stack-what-why-the-price-and-when-something-else-wins)
4. [How it works end to end, and why it works this way](docs/HANDBOOK.md#part-4-how-it-works-end-to-end)
5. [How to learn the codebase by heart](docs/HANDBOOK.md#part-5-learning-the-codebase-by-heart)

---

Built by Jaydeep Agravat, a mobile app developer exploring German fintech. This is an independent prototype, not the
official Zahln app. The names Zahln and ZYSYGY belong to their owners.
