# The Zaster Handbook

*One document that explains this whole project: the problem, the hard parts, the choices, how every part works,
and how to learn the code by heart. Read it from top to bottom once. After that, use it as a map.*

---

## Contents

- [Prologue: 8:12 on a Tuesday](#prologue-812-on-a-tuesday)
- [Part 1. The problem, and why it is worth solving](#part-1-the-problem-and-why-it-is-worth-solving)
- [Part 2. The hard parts](#part-2-the-hard-parts)
- [Part 3. The tech stack: what, why, the price, and when something else wins](#part-3-the-tech-stack-what-why-the-price-and-when-something-else-wins)
- [Part 4. How it works, end to end](#part-4-how-it-works-end-to-end)
- [Part 5. Learning the codebase by heart](#part-5-learning-the-codebase-by-heart)
- [Epilogue: what a real launch would add](#epilogue-what-a-real-launch-would-add)
- [Glossary](#glossary)

---

## Prologue: 8:12 on a Tuesday

Café Mila is a small café near the university in Augsburg. At 8:12 on a Tuesday the queue reaches the door.
Lena, a second-year student, orders a cappuccino and a croissant. That is €6.30.

Mila taps two tiles on her phone. A QR code appears. Lena scans it, sees "Café Mila, €6.30", and enters her PIN.
Less than a second later her phone turns green and says "Paid". At the same moment Mila's phone turns green too,
and the croissant is already in a paper bag. Nobody touched a card. Nobody paid a fee.

Now imagine the same morning, but the café Wi-Fi drops at the exact moment Lena taps "Pay". The bank has already
moved the money. The answer never reaches her phone. What does her phone say? What does Lena do next? If the app
gets this wrong, Lena pays twice, or Mila gives away a coffee, or both stop trusting the app forever.

This project is about both mornings: the easy one, and the one where everything goes wrong at the worst moment.

---

## Part 1. The problem, and why it is worth solving

### 1.1 What hurts today

**For the shop.** A small shop in Germany that takes cards pays for it in several ways:

- a fee on every card payment, which hurts most on small amounts like a €2.20 espresso;
- a card terminal, bought or rented;
- money that arrives days later, not now.

For a café that sells a lot of small things, these costs are a real part of the profit on every cup.

**For the customer.** Germany has a strong cash culture, and many small shops still prefer cash, or set a minimum
amount for cards. Students carry less cash than ever. They want to pay with their phone, quickly, and they want
to be certain about one thing above all: *was I charged, and only once?*

### 1.2 The idea

Europe already has a fast way to move money between bank accounts: **SEPA Instant**. It moves euros from one
account to another in seconds, at any hour, on any day. An EU regulation from 2024 also requires banks to offer
instant transfers, and at a price no higher than a normal transfer. So the "rail" (the road the money travels
on) already exists and is becoming normal.

What is missing is the experience at the counter. A bank transfer form is not a checkout. Typing an IBAN at a café
is not possible. So the idea of Zaster / Zettel is:

- **Zettel** turns the shop's phone into a till. It creates a QR code for exactly one payment.
- **Zaster** is the customer's wallet. It scans the code, shows what you are paying for, and asks for your PIN or Face ID.
- The money moves **account to account** over SEPA Instant. No card network sits in the middle, so there is no
  card fee to pass on. The business makes money from monthly plans for shops (Free, Pro, Business), not from a
  cut of every payment.

This repository is an unofficial learning prototype, not affiliated with any company. I built it as a mobile app developer to learn German fintech from the inside: how money really moves, what
German rules ask of a till and a receipt, and how to make a payment app that never charges twice.

### 1.3 Why this is worth building, even as a prototype

A payment app is one of the best ways to learn serious app development, because money removes all the shortcuts:

- A social app can show a "like" before the server confirms it. A payment app must **never** show "Paid" before
  the money has really moved.
- A news app can lose a request and try again. A payment app that tries again **without care** charges twice.
- A game can ship a bug and fix it next week. A payment app with a bug on the payment screen is a crisis, and a
  phone app cannot be fixed instantly.

So the prototype is built to answer real questions, not to look nice in screenshots (although it does that too):

| The real-world worry | What the prototype proves |
|---|---|
| "The Wi-Fi drops after the money already moved." | No double charge, ever. The app says "Checking" and finds out the truth. |
| "We cannot hotfix a phone." | Features can be switched off, plans changed, and old versions retired, all from a server, without a new release. |
| "Is every cent accounted for?" | A double-entry ledger, checked by the database itself. |
| "Can someone swap the QR code at the till?" | The QR holds only a signed reference. The amount and the shop name always come from the server. |
| "Does it feel good to use?" | Two native apps, three websites and one design system, in light and dark mode, in German and English, usable with a screen reader. |

---

## Part 2. The hard parts

Most of a payment app is normal app work: screens, lists, forms. The difficulty sits in a few places. Each one is a
small story.

### 2.1 The lost answer (the hardest problem in payments)

Lena taps "Pay". Her phone sends a request. On the server, the bank moves €6.30 and the database saves it. Then
the server sends the answer back... and the Wi-Fi is gone. Her phone waits, and then times out.

From the phone's point of view, three different worlds look exactly the same:

1. The request never arrived. No money moved.
2. The request arrived, the bank refused. No money moved.
3. The request arrived, the money moved, the answer was lost.

A simple app would show "Payment failed. Try again." In world 3, Lena pays a second time. This is the
**double-charge problem**, and it is not rare. On campus Wi-Fi, in a basement café, or in a train it happens daily.

**The fix has two halves.**

- **A ticket number for every payment** (an *idempotency key*). The phone creates one unique key when Lena confirms,
  and sends it with the request. The server remembers every key it has seen and the answer it gave. If the same
  key arrives again, the server does not pay again. It returns the first answer.
- **An honest "I don't know yet" state.** When the phone does not get an answer, it does not say "failed". It says
  **"Checking"**, and it asks the server, *"what happened to ticket K?"*, again and again with growing pauses, until it
  gets a real answer: "Paid", "Not charged", or "I never saw ticket K" (then it is safe to send the same ticket again).

It also covers the nasty edge cases. The phone writes the ticket to disk *before* the request leaves, so even if
Lena's phone dies mid-payment, the next launch says "We are checking your last payment" instead of forgetting.

You can watch this live: the server has a "chaos" switch that drops the answer on purpose after the money moved.

### 2.2 Every cent must add up

Money in a database is easy to get wrong:

- **Floats lie.** `0.1 + 0.2` is not `0.3` in most programming languages. So every amount here is an **integer
  number of cents** (`630`, not `6.30`), from the database to the screen. Only the very last step formats it as
  "€6.30" or "6,30 €".
- **A balance must not be a number you edit.** If you store "Lena has €35.40" and change it on every payment, one
  bug or one race between two requests can create or destroy money. Instead, this project uses a
  **double-entry ledger**, like an accountant's book: every payment is written as two lines, *minus 630 from Lena*
  and *plus 630 to Mila*, which always sum to zero. A balance is just the sum of the lines. The database itself
  refuses to save a transaction whose lines do not sum to zero, and refuses to edit old lines.
- **Two payments at once.** If Lena pays at two tills in the same second, both could read "balance €10" and both
  could spend it. So the server **locks Lena's account row** for the length of the payment, checks the balance, and
  writes the ledger lines, all inside one database transaction.

### 2.3 You cannot hotfix a phone

A website can be fixed in minutes. A phone app cannot. Every update goes through App Store and Play Store review,
and many people install updates days or weeks late. If the payment screen has a bug, waiting a week is not an option.

So the decisions that might need to change quickly live **on the server**, and the apps ask for them:

- **Kill switches:** turn a feature off on every phone at once (for example "Tap to Pay" or refunds).
- **Plans as feature flags:** the server decides what a shop's plan unlocks, so upgrading Döner Ali from Free to Pro
  in the support console unlocks one-time QR codes on its till within a second.
- **Forced update:** the server can say "versions older than X must update". Old apps then show a blocking
  "Please update" screen.

The hard part is not the switch itself. It is making sure the app **still works safely when the server is not
reachable** (it uses the last saved settings, and safe built-in defaults before that), and that a blocked version can
never reach a money screen, not even through a link.

### 2.4 Trust: the QR code is a stranger

A QR code is a picture. Anyone can print one and stick it over the real one. So:

- The QR never contains the amount or the shop's bank account. It holds only a **signed reference** to a payment
  that lives on the server (`<payment id>.<signature>`). The signature means nobody can invent or change a reference.
- After scanning, the app **asks the server** for the shop name and the amount, and shows those. What the QR "says"
  is never trusted.
- Each till QR works **once**, for **one amount**, for **five minutes**. The five minutes are measured by the
  database clock, not by the phone's clock, which a user can change.

### 2.5 One product, five surfaces

There are two phone apps (iOS and Android each), a web dashboard with a public checkout and a web wallet, a support
console, and a landing page. If each one defined "what a payment is" on its own, they would drift apart within a
week. The hard part is **sharing the right things**: the payment rules, the data shapes, the text in two languages,
and the design. Part 3 explains how one repository with shared packages solves this.

### 2.6 Germany's rules

Germany has precise rules for money and records:

- **GoBD**: business records must be complete, in order and unchangeable. So receipts have a running number per shop,
  a timestamp and a VAT breakdown, and payment records can never be edited.
- **DATEV**: the accounting format German tax advisers use. The dashboard exports it.
- **GDPR**: people can export their data and delete their account. But payment records must be kept for 10 years by
  law, so deletion **anonymises** the person and keeps the anonymous records.
- **Language**: German first, English second. German words are about 30 % longer, numbers are written `6,30 €`, and
  dates are `19.10.2026`. Every screen must handle both without breaking.

### 2.7 Making it feel instant, while telling the truth

People in a queue judge an app in one second. So the till must turn green the moment the money moves, with no
refresh. But "instant" must never become "optimistic". The rule here is simple: **show progress immediately, show
success only when the server says so.**

---

## Part 3. The tech stack: what, why, the price, and when something else wins

Every choice below has the same four parts: **what** was picked, **why**, **the price** paid for it, and **what
would be better, and when**. A choice without a trade-off is not a decision; it is a habit.

### 3.1 The whole stack on one page

| Layer | Choice |
|---|---|
| Phone apps | Bare React Native 0.88 (New Architecture), TypeScript |
| Mobile UI | NativeWind 4 (Tailwind classes), Reanimated 4, Gesture Handler, bottom sheets, FlashList |
| Navigation | React Navigation 7 (native stack) |
| App data | TanStack Query (server data) + Zustand (small local state) |
| Payment logic | A hand-written, typed state machine shared by every client |
| Device | vision-camera (QR scanning), react-native-keychain (secrets + biometrics), two own native modules (Swift, Kotlin) |
| Server | Node.js + Fastify 5, Zod schemas, Server-Sent Events |
| Database | Postgres 17 + Drizzle ORM, SQL triggers for the ledger rules |
| Bank | A simulated SEPA Instant "rail" behind an interface |
| Web | Next.js 16 (dashboard, web wallet, checkout), Vite + React + shadcn/ui (support console) |
| Landing page | Next.js 16 + Lenis + Motion + one OGL shader |
| Repository | pnpm workspaces + Turborepo, one monorepo |
| Quality | Biome, TypeScript strict, Vitest, Jest, Playwright + axe, Maestro, Storybook, Lighthouse CI, GitHub Actions |
| Text | i18next, German and English, one shared source |

### 3.2 Phone apps: bare React Native, not Expo

**What.** Two React Native apps built with the community CLI. Each one owns its `ios/` and `android/` folders.

**Why.** The apps need custom native code: a module that blocks screenshots on sensitive screens, and an Android
module that lets the till act like a contactless card. Owning the native folders makes that code, the permissions,
the entitlements and the certificate pinning fully visible. Nothing is generated or hidden.

**The price.** No Expo Application Services: no over-the-air JavaScript updates (EAS Update), no cloud builds, and
React Native upgrades are more manual work.

**Better if...** For a real product with a team, **Expo with "continuous native generation" and config plugins**
would likely be the better choice. Both native modules could be written as Expo Modules, upgrades would be easier,
and EAS Update adds a quick way to fix JavaScript bugs. Even then, over-the-air updates are a convenience, not the
safety net: they cannot change native code, and store rules limit what they may change. The safety net stays the
server-driven config from section 2.3.

**Why not Flutter or fully native (Swift + Kotlin)?** Fully native gives the best platform feel, but costs two
codebases for two apps, which is four projects. Flutter is excellent, but React Native shares one language
(TypeScript) and one set of data types with the server and the three websites. That sharing is worth more here than
any single framework feature.

### 3.3 Two apps instead of one app with two modes

**What.** Zaster (`de.zaster.app`) for customers and Zettel (`de.zettel.app`) for shops. About 90 % of the code lives in
shared packages. The apps are thin shells: their navigation, their own screens, and the native project.

**Why.** They are two products for two audiences with different risks. A till bug must not wait for a wallet
release. Only the customer app needs the camera. Separate apps mean separate store listings and separate permissions.
The server also checks the app: a request from the till app by someone who is not staff of a shop is refused.

**The price.** Two native projects to keep up to date. This is reduced by pinning one React Native version for
both and keeping native code in shared packages.

**Better if...** For a single app where every user is both buyer and seller (a marketplace), **one app with roles**
would be simpler.

### 3.4 Styling: NativeWind (Tailwind on mobile)

**What.** Tailwind class names on React Native, compiled at build time into normal styles.

**Why.** The same class names read the same on the phone and on the web, so a web developer can work in the app.
The design tokens (colours, spacing, type) are written once in TypeScript and **generated** into a Tailwind 3 preset
for mobile and CSS variables for the Tailwind 4 websites. The tokens are the contract, not any Tailwind config.

**The price.** NativeWind 4 needs Tailwind 3 while the websites use Tailwind 4, hence the generator. Some runtime
cost for dark mode and dynamic classes.

**Better if...** For the fastest possible rendering, **Unistyles 3** (a StyleSheet-style API with very low runtime
cost) wins. For a design system that must run identically on web and native from one component set, **Tamagui** is
strong, but heavy. Plain `StyleSheet` stays fine for one hot screen if profiling ever shows a problem.

### 3.5 Navigation: React Navigation 7

**What.** Native stack navigation with typed routes.

**Why.** It is the standard for bare React Native, uses real native transitions, and handles deep links. A key
design detail: sign-in, onboarding and the "Please update" gate are **separate root navigators**. A blocked app has
no route to any money screen, so even a link cannot reach one.

**Better if...** In an Expo project, **Expo Router** (file-based routes, automatic deep links) is the natural choice.

### 3.6 App data: TanStack Query + Zustand, and no optimistic money

**What.** Server data (balances, history, payment status, settings) lives in TanStack Query: caching, refetching
when the app comes back to the front, and retries. Small local state (is the app locked, which shop is selected)
lives in tiny Zustand stores.

**Why.** Most "state" in an app is really a copy of server data, and TanStack Query is very good at keeping copies
fresh. What is left is small enough that Zustand's few lines beat a large framework.

**The rule.** A balance is never changed optimistically. Money on screen is the server's truth, or a clearly
labelled pending state.

**Better if...** A very large team that wants one strict pattern everywhere might prefer **Redux Toolkit + RTK Query**.

### 3.7 The payment logic: a hand-written state machine

**What.** One typed reducer (`packages/shared/src/state/paymentAttempt.ts`) describes every state a payment can be in
and every legal move between them:

```
idle → scanned → confirming → authorising → submitting → checking → paid
                                                       ↘ not_charged | insufficient_balance | expired | failed
```

The Zaster app and the web checkout use the **same** reducer. A second machine
(`paymentIntent.ts`) describes the till's side: `awaiting_scan → scanned → paid → partially_refunded → refunded`,
or `expired` / `cancelled`. The server checks this one before every status change.

**Why.** "Think in states, not screens." Every state has exactly one screen, and the dangerous rule is written in
one place: once a request may have reached the server (`submitting`), the only ways out are a real answer or
`checking`. There is **no path** that sends the payment again with a *new* ticket number. Unit tests prove it.

**Better if...** **XState** gives visual charts, parallel states and a debugger. It is a good choice when machines
get bigger or a team wants to review them visually. Here the machine is small enough to read line by line, and plain
code is easier to explain.

### 3.8 Server: Node.js + Fastify, with shared Zod schemas

**What.** A Fastify 5 server in TypeScript. Every request and response shape is a Zod schema in
`packages/shared`, used by the server to validate and by the apps and websites to parse.

**Why.** One schema, used everywhere, means a server change that would break an app fails the **type check**, not
production. Fastify is fast, schema-first and small.

**Better if...**
- For a large, long-lived payments backend, **Go** (or Kotlin/Java) is a strong choice: simple concurrency, single
  binaries, mature finance tooling. The price is losing shared types; you would describe the API in **OpenAPI** and
  generate client types from it.
- For a bigger Node team that wants strong structure, **NestJS**. For edge or serverless hosting, **Hono**.

### 3.9 Database: Postgres + Drizzle, with rules inside the database

**What.** Postgres 17 in Docker, Drizzle ORM for typed queries, and plain SQL migrations for the important rules:

- a **deferred trigger** that checks, at commit time, that every ledger transaction sums to zero;
- triggers that make ledger lines and the audit log **append-only** (no edits, no deletes);
- unique indexes so that one payment can have only one successful attempt, and one ticket number only one answer.

**Why.** Money rules must hold even when the code has a bug. A rule in the database cannot be skipped by a forgotten
`if`. Postgres is the safest default for money: real transactions, row locks, constraints. Drizzle stays close to
SQL, so the ledger is visible rather than hidden behind an ORM.

**Better if...** **Prisma** has a friendlier schema language and tooling, but hides more SQL. At very large scale,
a dedicated ledger database such as **TigerBeetle** is built exactly for double-entry accounting at high speed.

### 3.10 Live updates: Server-Sent Events, as a hint

**What.** The till, the web dashboard and the console subscribe to a stream of events (SSE). When a payment's status
changes, the server pushes the new status.

**Why SSE and not WebSockets?** The updates flow one way (server → screen). SSE is plain HTTP, reconnects by itself,
and passes through proxies easily. WebSockets are two-way and need more care.

**The rule.** Live updates are a **hint, not the truth**. The first event on every stream is the current status, so
a reconnect catches up by itself, and if the stream dies the screen asks the server directly. The server publishes
an event **only after** the database commit, because a till that turns green for a payment that then rolls back is far
worse than a till that turns green one second late.

**The price.** The event bus is in-process (one Node `EventEmitter`), which works for one server instance.

**Better if...** With several server instances, the same two functions would sit on **Postgres LISTEN/NOTIFY** or
**Redis pub/sub**. For updates while the app is closed, **push notifications** (APNs, FCM) are needed on top.

### 3.11 The bank: a simulated rail behind an interface

**What.** `SimulatedSepaInstantRail` implements a small `PaymentRail` interface: "move this amount from this account
to that account". It answers like a real instant-payment rail: settled (in about 120 ms), slow, or rejected.
A **chaos switch** can make it slow, reject, report "not enough money", or drop the answer after the money moved.

**Why.** The real thing needs a bank licence or a partner (a payment service provider), contracts and certification.
The interface means a real provider adapter can replace the simulation without touching the rest of the code.
The chaos switch turns the hardest problems into something you can test and demo on demand.

### 3.12 Web: Next.js for customers, Vite for the console

**What.** `apps/web` uses Next.js 16 for three things: the shop dashboard, the customer web wallet, and the public
checkout page that opens when someone follows a payment link. `apps/console` (the support tool) is a Vite +
React single-page app with shadcn/ui components and TanStack Table.

**Why Next.js for the customer side.** The checkout page is public and must load fast on a cheap phone over mobile
data, so it is rendered on the server with very little JavaScript. One framework covers that and the dashboard.

**Why not Next.js for the console.** An internal tool behind a login needs no server rendering or SEO. A static
single-page app is simpler to build, host and protect.

**Better if...** **React Router 7 (Remix)** is an equally good choice for the customer web app. A pure single-page app
would make the checkout's first paint slower.

### 3.13 Web sign-in: cookies, not tokens in the browser

**What.** The websites use an **httpOnly, Secure, SameSite cookie** for the session, a CSRF token bound to the session,
and a "step-up" rule: refunds, payouts, plan and team changes need a fresh code from the last 10 minutes.

**Why.** A token in `localStorage` can be read by any script injected into the page (XSS). An httpOnly cookie cannot.
The phone apps use a different model on purpose: a bearer token **bound to the device**, stored in the Keychain or
Keystore, because a phone has no browser cookie jar and device binding is the point.

**Better if...** For many apps and partners signing in, a dedicated identity service (OAuth 2.0 / OpenID Connect)
would replace the hand-made session code.

### 3.14 Device security: Keychain, biometrics, and two own native modules

**What.**
- `react-native-keychain` stores secrets in the iOS Keychain / Android Keystore, with biometric protection.
- **SecureScreen** (Swift + Kotlin, a TurboModule): on Android it blocks screenshots and screen recording on the PIN
  pad, wallet, receipts and refund sheet; on iOS it blurs the app-switcher preview and hides the balance while the
  screen is being recorded. It also gives simple root/jailbreak hints.
- **NfcPay** (Kotlin, Android only): the till acts like a contactless card and hands the customer's phone the same
  signed reference the QR holds.

**Why write native modules by hand?** A screenshot flag is a few lines of native code. Adding a third-party library
for it to a payment app adds supply-chain risk for no gain. But a QR scanner is hard to get right, so that comes from
a well-known library (`react-native-vision-camera`).

**Why NFC only on Android?** On Android any app may act as a card (Host Card Emulation). On iPhone this is only
possible in the EEA, with a special Apple entitlement, a commercial agreement and payment-provider status. So QR is
the path that works on every phone, and NFC is an extra on Android. A `nfc_pay` kill switch can turn it off everywhere.

**Better if...** The next security step would be **hardware-backed signing keys** (Secure Enclave / StrongBox) that sign
each payment's amount and payee. That is what strong customer authentication under PSD2 really asks for.

### 3.15 One repository: pnpm + Turborepo

**What.** All apps and packages in one repository, with pnpm workspaces and Turborepo to cache builds, type checks and tests.

**Why.** The shared packages are the reason five front ends stay one product:

| Package | What it holds | Who uses it |
|---|---|---|
| `shared` | Zod schemas, payment state machines, money, plans, remote-config rules, log scrubber, German/English text, design tokens | everyone |
| `mobile-core` | API client, session and lock, Keychain, biometrics, preferences, remote config, logger (no UI) | both apps |
| `mobile-ui` | Mobile design system and the screens both apps share (onboarding, lock, settings, wallet) | both apps |
| `web-ui` | Web design system (Tailwind 4 + restyled shadcn components) | web, console |
| `secure-screen`, `nfc-pay` | The native modules | both apps |

A lint rule enforces the direction: `mobile-ui` may use `mobile-core`, never the other way, and no package may import an app.

**The price.** React Native and monorepos need care: Metro must watch the shared folders, there must be exactly one
copy of `react` and `react-native`, and native autolinking must find packages. A "hoisted" `node_modules` solves most of it.

**Better if...** For a much larger organisation, **Nx** offers stronger project rules and code generators.

### 3.16 Quality tools

| Tool | Job | Better if... |
|---|---|---|
| **Biome** | One fast tool for lint and format (instead of ESLint + Prettier) | ESLint wins if you need a plugin Biome lacks |
| **TypeScript strict** | Catches whole classes of bugs, and keeps app and server in sync via shared types | |
| **Vitest** | Server, ledger, idempotency, state machines, shared rules | |
| **Jest + Testing Library** | Mobile components and hooks | |
| **Playwright + axe** | Web journeys in a real Chrome, with accessibility checks in light and dark mode | |
| **Maestro** | Phone journeys on the iOS simulator (pay, lost connection, till) | **Detox** for deeper, grey-box control; Maestro is simpler to write and read |
| **Storybook** (web and React Native) | Every component in light, dark, German and English | |
| **Lighthouse CI** | Performance and accessibility budgets for the landing page | |
| **GitHub Actions** | One pipeline for all of the above, except Maestro (needs a Mac runner) | |

### 3.17 Text and design

- **i18next** with one German and one English file in `packages/shared/src/i18n`, used by both apps. Money and dates
  are always formatted with `Intl`, never by joining strings.
- **"Ember and ink"** is the design system: warm paper backgrounds, near-black ink, one ember-orange brand colour, and
  a strict rule: **green appears only when money has actually moved**. The brand colour is orange so it can never be
  confused with "Paid". Every colour pair is checked for WCAG contrast in a test.
- **The landing page** borrows the *mechanics* of Shopify Editions pages (chapters, sticky art, a frame that turns
  into navigation) with public-domain Old Master paintings of money-changers and merchants. It uses **Lenis** for
  smooth scrolling, **Motion** for scroll animation, and **OGL** for one full-screen shader. OGL is chosen over
  Three.js because one shader needs about 30 KB, not a 600 KB 3D engine. Budgets for speed and accessibility are
  enforced in CI. Image licences are recorded in `apps/landing/ASSETS.md`.

---

## Part 4. How it works, end to end

This part follows the money. Each step says **what happens**, **why it works this way**, **why not another way**,
and **what would be even better** in a real launch.

### 4.1 Getting started: phone number, code, PIN

**What happens.** Lena enters her phone number. The server creates a 6-digit code (in development it is always
`123456`) and stores only a **hash** of it, valid for 5 minutes and 5 tries. With the right code, the phone registers
itself as a **device** and gets a token that only works together with that device's ID. Lena chooses a 6-digit PIN
(easy PINs like `123456` are refused) and can turn on Face ID.

**Why this way.** A phone number is the simplest identity that students already have. Binding the token to a device
means a stolen token is useless on another phone.

**Why not a password?** People reuse passwords, and typing one at a till is slow. A PIN on a device the person
holds, plus the device binding, is two factors: something you have and something you know.

**Better in a real launch.** In this prototype the PIN is checked **on the phone** (stored in the Keychain, with an
attempt counter that survives clearing app data). A real launch should verify the PIN **on the server**, with
per-device rate limits, so a jailbroken phone cannot try all PINs offline. The next step after that is a
hardware-backed key that signs each payment.

### 4.2 Ringing up: the till creates a payment

**What happens.** Mila taps Cappuccino and Croissant and presses "Charge €6.30". The till sends the basket to the
server. The server looks up the **prices itself** (the till sends item IDs, not prices), creates a **payment intent**
(status `awaiting_scan`, valid for 5 minutes by the database clock), and returns a **signed reference**:
`<intent id>.<16 characters of HMAC-SHA256>`. The till draws this reference as a QR code and shows a countdown.

**Why this way.**
- The server sets the prices, so a modified till app cannot sell a croissant for one cent.
- The QR holds no amount and no account, only a reference the server signed. A fake QR has no valid signature.
- One intent per sale means "valid once, for one amount, for 5 minutes" is a database fact, not a promise.

**Why not put the amount in the QR?** Then a printed sticker could change it, and the app would have to trust a
picture.

**Plan check.** One-time QR codes are a **Pro** feature. A shop on Free gets a permanent **static QR** (its
`@handle`), where the customer types the amount (section 4.8). The server checks the plan; the till also hides
the button, but the server's check is the one that counts.

### 4.3 Watching the till: live status over SSE

**What happens.** The till opens a stream: `GET /intents/:id/events`. The first event is the current status. Later
events arrive as the status changes: "Customer is reviewing" when Lena scans, "Paid" when the money moves, "Expired"
at minute five.

**Why this way.** SSE is one-way, simple and reconnects by itself (section 3.10). The stream itself also expires the
intent at minute five, because no other part of the system would otherwise notice that an unpaid QR ran out.

**Why not polling every second?** It works (and it is the fallback), but it is slower and wastes battery and server
work for hundreds of tills.

**Better in a real launch.** A message bus across server instances (Redis or Postgres LISTEN/NOTIFY), and a
background job that expires old intents even when no till is watching.

### 4.4 Scanning: the customer's phone asks the server

**What happens.** Lena's camera reads the QR. The app does not trust it: it calls
`GET /intents/by-ref/:ref`, the server **verifies the signature**, and returns the shop name, the items and the
amount. The app shows those. It also tells the server "scanned", so the till can show "Customer is reviewing". That
call is "fire and forget": if it fails, paying still works.

The same path works for **payment links** (`https://pay.zaster.de/i/<ref>` or `zaster://i/<ref>`) opened from a browser
or a message. A link that arrives while the app is locked waits in a small buffer and is used **only after** the PIN
unlock. A link can never skip the PIN.

**Why this way.** The server is the only source of truth for who gets paid and how much. A link or QR is just a
pointer to that truth.

### 4.5 Paying: the most important 300 lines

This is the heart of the system. Read it slowly.

**On the phone** (`packages/mobile-core/src/payments/usePayment.ts`):

1. Lena taps "Pay with PIN · €6.30" and enters her PIN.
2. **Only now** the app creates the ticket number: a random UUID, the idempotency key. Not before, because a key
   created too early could be reused for a different payment; not later, because every send must use it.
3. The app **writes the key to disk first** ("pending payment"), and only then sends
   `POST /intents/:id/pay` with the header `Idempotency-Key: <key>`.

**On the server** (`apps/api/src/lib/idempotency.ts`, then `payIntent` in `apps/api/src/lib/payments.ts`):

1. **Claim the ticket** in its own short transaction:
   - key never seen → mark it `processing` and continue;
   - same key, same request, already finished → **return the stored answer** (no second payment);
   - same key but a different request → refuse (422), that is a client bug;
   - same key still `processing` → answer "in progress" (409), ask again soon.
2. **Do the payment in one database transaction**:
   1. lock the intent row; check it is payable and not past its expiry (by the database clock);
   2. lock Lena's account row; compute her balance as the sum of her ledger lines;
   3. if the balance is too low → record "not enough balance";
   4. ask the bank rail to move the money; if it refuses → record "not charged";
   5. write the ledger transaction: `−630` from Lena, `+630` to Mila (the database checks it sums to zero);
   6. give the shop's next receipt number; mark the intent `paid`;
   7. **store the answer next to the ticket**, in the same transaction.
3. **After the commit**, publish "paid" to the event bus, so the till turns green.

Step 2.7 is the key idea: "money moved" and "answer saved" **commit together or not at all**. So if the answer is
lost on the way back, the server can always repeat it.

**Why this way and not another?**

| Alternative | Why not |
|---|---|
| Retry automatically with a new request | A new request is a new payment. This is exactly how double charges happen. |
| Show "Failed" on a timeout | Wrong in the case where the money moved. The honest answer is "Checking". |
| Let the till decide "paid" | The till can be offline or modified. Only the server and the ledger decide. |
| Check for duplicates by "same amount, same shop, same minute" | Two real coffees in the same minute are normal. A ticket number is exact. |
| Store and update a `balance` column | One bug or race and money appears or disappears. Ledger lines plus a sum cannot drift. |

**What would be better in a real launch.** In this prototype the (simulated, in-memory) bank call happens
**inside** the database transaction. A real bank call is a slow network request to another company, and holding
database locks during it is risky. Production would split it:

1. in one transaction, **reserve** the funds and record "payment requested" in an **outbox** table;
2. commit;
3. a worker sends the request to the payment provider, again with an idempotency key;
4. the provider's answer (or its webhook) **settles** or **releases** the reservation in a new transaction.

This is the *outbox pattern*. It costs more moving parts, but no lock is ever held while waiting for a bank.

### 4.6 When the answer is lost: "Checking"

**What happens.** The request times out, or the connection drops, or the server says "in progress". The app does not
know what happened, so it moves to **`checking`** and asks `GET /attempts/by-key/<key>` with growing pauses
(0.8 s, 1.5 s, 2.5 s, 4 s, 6 s, 8 s). It also checks immediately when the app comes back to the front.

- Answer "paid" or "not charged" → show it. Done.
- Answer "never saw this key" (404) → the request never arrived. It is **safe to send again with the same key**.
- No answer for 60 seconds → the screen says "Your money is safe. Either the payment arrived, or nothing was
  charged. We keep checking, and you will see the result in your history", and it keeps checking every 15 seconds.

If the app was **killed** mid-payment, the next launch finds the saved key on disk and starts in `checking`. The web
checkout does the same with the browser's `sessionStorage`, so a page reload continues checking instead of paying again.

**Why this way.** It is the only honest design: the app never claims more than it knows, and every path back to the
server uses the same key.

**Why not just poll the payment's status?** Because "the intent is unpaid" cannot tell apart "my request never
arrived" from "my request is still running". Only the ticket number can.

**Try it.** In the console, set the chaos mode to "Drop the response". Pay. You will see "Checking", then "Paid",
and exactly one ledger transaction. The automated tests check this too.

### 4.7 The till turns green

The server publishes "paid" after the commit; the till's SSE stream shows it; the till shows "Paid · Receipt no. 3"
and returns to the catalogue after 4 seconds, because the queue matters more than the animation. The web dashboard's
"Today" page updates live too, and its total counts up.

### 4.8 Static QR codes and payment requests

- **Static QR (`@handle`)**: printed once and stuck on the counter. It never expires. The customer scans it, types the
  amount, and the server turns that into a **normal one-time intent**, so the exact same pay → ticket → checking path
  applies. One payment engine, not two.
- **Payment requests** (web dashboard): the shop creates a link for an amount, valid for 24 hours, for example for
  catering. It opens the same checkout and the same engine.

### 4.9 Refunds

**What happens.** In the till app (or the web dashboard), a manager opens a payment, chooses an amount and a reason,
and confirms with the PIN (or a fresh code on the web). The server locks the intent, checks the total refunded can
never exceed what was paid, writes a reversed ledger transaction, and moves the intent to `partially_refunded` or
`refunded`. Refunds also use an idempotency key.

**Why this way.** Refunds move money, so they get the same protection as payments, plus a role check: only owners
and managers may refund.

**Better in a real launch.** Large refunds would need a second person's approval ("four eyes").

### 4.10 Changing the apps without a release

**What happens.** Every app ships with **safe built-in defaults**. On start, on returning to the front, and on
sign-in, it fetches `GET /config` (which works signed out, because the "Please update" gate must work before login).
It also listens to `GET /config/events` and refetches the moment the support team changes something. If the server
is not reachable, it keeps the last saved config.

The config holds:
- **kill switches** (`nfc_pay`, `refunds`, `topup`),
- **minimum and latest app versions** per app (below the minimum → "Please update"),
- **limits** (for example, payments above €50 need the PIN, not just Face ID),
- for a till, **the shop's plan**, which unlocks features (`hasFeature(plan, feature)` in `packages/shared/src/plans.ts`).

Every change is made in the console, needs a **reason**, and is written to an **append-only audit log**.

**Why this way.** It is the answer to "you cannot hotfix a phone" (section 2.3). One mechanism serves two purposes:
safety (kill switches, forced updates) and business (plans).

**Why not over-the-air updates only?** They cannot change native code, and they still ship a new build of the
JavaScript. A kill switch is a single, instant, reversible decision.

**Better in a real launch.** A feature-flag service (LaunchDarkly, Unleash, or similar) adds gradual roll-outs
(1 % → 10 % → 100 %) and targeting. Expo's EAS Update could sit on top for JavaScript fixes.

### 4.11 The websites

- **Checkout (`/i/<ref>`)**: rendered on the server for a fast first paint. "Open in the app" or "Pay in the
  browser" with the Zaster phone number and a one-time code. It uses the **same** payment state machine as the app.
  A forged or unknown link shows "Invalid link".
- **Dashboard (`/business`)**: Today (live), Transactions with receipts, Payment requests, Payouts, Team, Plan,
  Export (DATEV CSV) and a printable QR poster.
- **Web wallet (`/wallet`)**: balance, history, signed-in devices (each one can be signed out), data export.
- **Support console** (`apps/console`): find any payment, see its timeline and its ledger lines, refund with a reason,
  manage shops and plans, flip switches, read the audit log. Every action is signed with the operator's name.

### 4.12 Safety nets everywhere

- **Logs never contain secrets.** The apps can only log through one `logger`, and every entry goes through
  `scrub()` (`packages/shared/src/scrub.ts`), which removes tokens, PINs, phone numbers, IBANs and balances. The lint
  rules forbid `console.*`. The same scrubber would become the crash reporter's filter.
- **Certificate pinning** for the release API on iOS and Android (with a backup pin and an expiry date, so a
  forgotten rotation cannot lock out old app versions).
- **Data rights (GDPR):** export your data; delete your account (refused while money is left or while you own a
  shop; payment records stay for 10 years, anonymised).
- **Privacy by default:** shops see payers as "Lena H.", never the full name or number.

---

## Part 5. Learning the codebase by heart

You do not learn a codebase by reading every file. You learn it by understanding a few ideas, then following one
payment from the first tap to the last database row until you can tell the story without looking.

### 5.1 The ideas to understand first

Learn these, in this order. Each one unlocks a part of the code.

| # | Idea | In one sentence | Where it lives |
|---|---|---|---|
| 1 | **Integer cents** | Money is always a whole number of cents; formatting happens only at the very end. | `packages/shared/src/money.ts` |
| 2 | **Double-entry ledger** | Every money movement is lines that sum to zero; a balance is a sum, never a stored number. | `apps/api/src/lib/ledger.ts`, `apps/api/drizzle/0001_ledger_rules.sql` |
| 3 | **Intent vs attempt** | An *intent* is "the shop wants €6.30" (one per QR); an *attempt* is "this payer tried to pay it with this key". | `apps/api/src/db/schema.ts` |
| 4 | **Idempotency** | A ticket number makes "send twice" equal "send once". | `apps/api/src/lib/idempotency.ts` |
| 5 | **State machines** | Every payment state and every legal move is written down once and shared. | `packages/shared/src/state/` |
| 6 | **Database transactions and row locks** | Things that must happen together commit together; locks stop two payments racing. | `payIntent` in `apps/api/src/lib/payments.ts` |
| 7 | **Signed references** | A QR or link is a pointer with a signature, never data to trust. | `apps/api/src/lib/intentRef.ts`, `packages/shared/src/payUrl.ts` |
| 8 | **"The server is the truth; live updates are hints"** | SSE makes things fast; correctness never depends on it. | `apps/api/src/lib/eventBus.ts`, `apps/api/src/routes/events.ts` |
| 9 | **Server-driven config** | Safety switches and plans come from the server, with safe defaults on the phone. | `packages/shared/src/config.ts`, `packages/mobile-core/src/remoteConfig.ts` |
| 10 | **Shared packages and their direction** | `shared` → `mobile-core` → `mobile-ui` → apps; never the other way. | `packages/*`, `biome.json` |
| 11 | **The app is the role** | Each app tells the server who it is (`x-app`), and the server enforces it. | `configureApp` in `packages/mobile-core/src/app.ts`, `apps/api/src/routes/auth.ts` |
| 12 | **React Native's native layer** | TurboModules, Codegen specs, Swift/Kotlin, and how autolinking finds them. | `packages/secure-screen`, `packages/nfc-pay` |

### 5.2 Follow one payment through the code

Open these files side by side and trace Lena's €6.30. This one exercise teaches more than reading everything.

1. **The till builds the basket:** `apps/merchant/src/features/till/TillScreens.tsx` and `cart.ts`, then
   `openIntent.ts` sends it.
2. **The server creates the intent:** the `POST /merchants/:merchantId/intents` route in
   `apps/api/src/routes/index.ts` → `createIntent` in `apps/api/src/lib/payments.ts` → `signIntentRef` in `intentRef.ts`.
3. **The till shows the QR and listens:** `apps/merchant/src/features/till/QrScreen.tsx` → the SSE route in
   `apps/api/src/routes/events.ts`.
4. **Lena scans or opens a link:** `apps/consumer/src/features/pay/ScanScreen.tsx`, or `usePayLinks.ts` for links →
   `PayScreen.tsx`.
5. **The phone runs the state machine:** `packages/mobile-core/src/payments/usePayment.ts`, driving
   `attemptReducer` in `packages/shared/src/state/paymentAttempt.ts`.
6. **The server pays:** `POST /intents/:intentId/pay` in `routes/index.ts` → `withIdempotency` → `payIntent` →
   `postTransaction` → the rail in `apps/api/src/rail/`.
7. **The till turns green:** `publishIntent` after the commit → the SSE stream → `PaidScreen.tsx`.
8. **The receipt:** `apps/consumer/src/features/pay/ReceiptScreen.tsx`.

Then do it again with the chaos mode "Drop the response" and follow the `checking` branch: `OUTCOME_UNKNOWN` in the
reducer → the checking effect in `usePayment.ts` → `GET /attempts/by-key/:key` → `getAttemptByKey`.

### 5.3 A map of the repository

```
apps/
  consumer/    Zaster, the customer app. Thin: navigation + pay, history, receipt screens + native project
  merchant/    Zettel, the till app. Thin: navigation + till, QR, paid, payment, refund + native project
  api/         The server
    src/routes/    HTTP routes (public, auth, payments, events, web, admin, config)
    src/lib/       The real logic: payments, ledger, idempotency, intentRef, config, audit, webSession, sse
    src/rail/      The simulated bank and the chaos switch
    src/db/        Drizzle schema, migrations runner, seed data
    drizzle/       SQL migrations, including the ledger and audit triggers
    test/          Vitest tests against a real Postgres
  web/         Zaster Web (Next.js): app/business, app/wallet, app/i/[ref] (checkout), e2e/ (Playwright)
  console/     Zaster Ops (Vite + React)
  landing/     The landing page
packages/
  shared/        Schemas, state machines, money, plans, config rules, scrubber, i18n, tokens
  mobile-core/   API client, session, keychain, biometrics, remote config, logger, payment hooks
  mobile-ui/     Design system + shared flows (onboarding, lock, settings, wallet), Storybook stories
  web-ui/        Web design system
  secure-screen/ Native module: screenshot protection, integrity hints
  nfc-pay/       Native module: Android till-as-card
scripts/screens/ Regenerates every screenshot in the README
```

### 5.4 Questions to answer without looking

You know the codebase by heart when you can answer these from memory:

1. Why is the idempotency key created at authorisation, not when the screen opens? Why is it saved to disk before the request?
2. Which three different situations look the same to a phone after a timeout, and how does `checking` tell them apart?
3. What happens if two tills charge Lena in the same second? Which line of code stops a double spend?
4. Why can a bug in the code not save an unbalanced ledger transaction?
5. Why does the QR not contain the amount? What exactly does it contain?
6. Why is the "paid" event published after the commit and not before?
7. The SSE stream dies. What does the till do? What does the customer's phone do?
8. The config server is down when the app starts. What does the app show, and why is that safe?
9. Why are there two apps and not one? What is shared, and what is not?
10. What would you change first to connect a real payment provider? (Hint: section 4.5, the outbox.)

<details>
<summary><strong>Answers</strong> (try first, then open)</summary>

**1. When the key is created, and why it goes to disk first.**
The key stands for *one decision to pay*. If it were created when the screen opens, it could be reused for a
different amount or a different try after a cancel, and the server would return an old answer for a new payment.
It is created after the PIN or Face ID, so one key means exactly "Lena said yes to this payment". It is written to
disk *before* the request leaves because the phone can die at any moment after sending. On the next launch the app
finds the key and starts in `checking`. Without that, the app would forget a payment the server may have made.

**2. Three worlds that look the same.**
(a) the request never arrived; (b) it arrived and was refused; (c) it arrived, the money moved, and the answer was
lost. `checking` asks `GET /attempts/by-key/<key>`. A stored answer means (b) or (c), and the app shows it
("Not charged" or "Paid"). A 404 means (a), and it is safe to send again **with the same key**. A request still
running answers "in progress", and the app asks again after a pause.

**3. Two tills, same second.**
Both reach `payIntent` in their own transaction. Each one calls `lockAccount(tx, payer)`
(`apps/api/src/lib/payments.ts`, which runs `SELECT … FOR UPDATE` in `apps/api/src/lib/ledger.ts`) *before*
`balanceOf`. The second transaction waits on the lock until the first commits. Then it reads the new balance,
which already includes the first payment. If the money is not enough any more, it records "not enough balance".
Without the lock, both would read the old balance and both would spend it.

**4. Why an unbalanced ledger transaction cannot be saved.**
The rule lives in the database, not in the code. A `DEFERRABLE INITIALLY DEFERRED` constraint trigger
(`apps/api/drizzle/0001_ledger_rules.sql`) checks at `COMMIT` that the lines of each transaction sum to zero. If
they do not, Postgres raises an error and rolls back the whole transaction. Other triggers refuse every `UPDATE` or
`DELETE` on ledger lines. A forgotten `if` in TypeScript cannot skip any of this.

**5. What the QR holds.**
Only `<intent id>.<16 characters of HMAC-SHA256>`: a pointer to a payment on the server, plus a signature that
only the server can make. With no amount and no account in it, a sticker cannot change who gets paid or how much.
A forged reference fails the signature check. The amount and the shop name shown to Lena always come from
`GET /intents/by-ref/:ref`.

**6. Why "paid" is published after the commit.**
Until the commit, the payment may still roll back (a failed ledger check, a lost connection, a crash). If the event
went out first, the till could turn green and hand over the croissant for money that never moved. Publishing after
the commit means the till can be one second late, but never wrong.

**7. The SSE stream dies.**
*The till* (`useIntentStatus.ts`): the SSE library tries to reconnect by itself, and in the meantime the hook polls
`GET /intents/:id` every 2 seconds. Coming back to the foreground always refetches. When the stream is back, the
first event is the current status, so a missed event catches up by itself. *The customer's phone* does not depend
on SSE for paying at all. It learns the result from the answer to `POST /pay`, or from `checking` by key.

**8. The config server is down at start.**
The app never waits for config. It starts with the last config it saved, or, on a very first launch, with the
`bundledDefaults` built into the app (`packages/shared/src/config.ts`): no kill switch on, no flags, no plan
features assumed, and **never** a forced update. This is safe because the server still checks every rule on every
request: an old or missing config can at most show a button that the server then refuses. And a stale default can
never lock someone out of their money.

**9. Two apps, not one.**
Two audiences with different risks and release needs: a till bug must not wait for a wallet release, only the
wallet needs the camera, and each app gets its own store listing and permissions. The server also uses the app
identity (`x-app`) to refuse till requests from people who are not shop staff. *Shared:* schemas, state machines,
money, plans, config rules, text, design tokens (`shared`); API client, session, Keychain, remote config, logger
(`mobile-core`); design system and common flows like onboarding, lock, settings and wallet (`mobile-ui`); and the
native modules. *Not shared:* each app's navigation, its own screens (pay and receipt; till, QR and refund) and its
`ios/` and `android/` projects.

**10. Connecting a real payment provider.**
Write an adapter for the `PaymentRail` interface, and move the bank call **out of** the database transaction with
the outbox pattern: reserve the funds and write "payment requested" to an outbox table in one transaction; commit;
a worker sends the request to the provider with its own idempotency key; the provider's answer or webhook settles or
releases the reservation in a new transaction. Then add daily reconciliation against the bank's statement. The phone,
the ticket number and `checking` stay the same.

</details>

### 5.5 Run it, break it, watch it

```bash
cp .env.example .env
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm api           # API on :4000
pnpm console       # support console on :5174
pnpm web           # web on :3000
pnpm consumer      # then: pnpm consumer:ios
pnpm merchant      # then: pnpm merchant:ios
```

Demo logins: Lena `0151 0000 0001`, Mila `0151 0000 0010`. The code is always `123456`; the demo PIN is `271828`.

Then break it on purpose, from the console's control room:
- **Drop the response** → watch "Checking", then "Paid", and count the ledger lines (exactly one transaction).
- **Bank rejects** → "Not charged".
- **Not enough balance** → "Not enough balance", with a top-up offer.
- **Upgrade Döner Ali to Pro** → one-time QR codes appear on its till.
- **Raise the minimum version** → "Please update"; lower it → the app recovers.

The tests are the other way to learn: `apps/api/test/payments.test.ts` reads like a list of everything that can go
wrong with a payment, and how the system answers.

---

## Epilogue: what a real launch would add

The prototype is honest about its edges. A real launch would add, roughly in this order:

1. **A licensed partner** (a payment service provider or bank) behind the `PaymentRail` interface, with the
   **outbox pattern** from section 4.5, webhooks, and daily reconciliation against the bank's statement.
2. **Strong customer authentication** with hardware-backed keys that sign each payment, and server-side PIN checks.
3. **German cash-register law** (KassenSichV): signing receipts with a certified security module (TSE), for example
   through Fiskaltrust.
4. **Operations**: a crash reporter in an EU region (with the existing scrubber as its filter), metrics for time to
   confirmation, staged roll-outs, Play Integrity / App Attest, single sign-on and four-eyes approval in the console.
5. **Scale**: a shared event bus across server instances, a background job for expiry, push notifications.
6. **Store release**: real certificate pins, app review, and the iPhone NFC entitlement if it is worth it.

None of these change the core story. The ticket number, the ledger, the state machine and the server-driven switches
are the parts that make a payment app trustworthy, and they are already here.

---

## Glossary

| Term | Meaning |
|---|---|
| **SEPA Instant** | The European system that moves euros between bank accounts in seconds, at any time. |
| **Account-to-account (A2A)** | Money goes directly from the payer's bank account to the shop's, with no card network between. |
| **Rail** | The system money travels on, for example card networks or SEPA Instant. |
| **Intent** | "The shop wants this amount for this basket." One per QR code. |
| **Attempt** | "This person tried to pay that intent, with this ticket number." |
| **Idempotency key** | A unique ticket number on a request; sending it twice has the same effect as sending it once. |
| **Double-entry ledger** | An accounting book where every movement is written as lines that sum to zero. |
| **Row lock** | A database lock on one row, so two transactions cannot change it at the same time. |
| **Outbox pattern** | Save "this message must be sent" in the same transaction as the data, and send it afterwards with a worker. |
| **HMAC** | A signature made with a secret key; it proves a value was created by the server and not changed. |
| **SSE** | Server-Sent Events: a simple one-way stream from server to browser or app. |
| **Kill switch** | A server setting that turns a feature off in every app at once. |
| **Feature flag / plan** | A server setting that decides which features a user or shop gets. |
| **Forced update** | Old app versions are blocked and asked to update. |
| **State machine** | A list of all possible states and the allowed moves between them. |
| **TurboModule** | Native code (Swift, Kotlin) that a React Native app calls directly. |
| **HCE** | Host Card Emulation: a phone acting like a contactless card. |
| **GoBD** | German rules for keeping business records complete and unchangeable. |
| **DATEV** | The accounting format German tax advisers use. |
| **KassenSichV / TSE** | German cash-register law, and the certified security module that signs receipts. |
| **GDPR** | The EU privacy law: people can see, export and delete their data. |
| **PSD2 / SCA** | EU payment rules that require strong customer authentication (two factors) for payments. |
| **Monorepo** | All apps and shared code in one repository. |
