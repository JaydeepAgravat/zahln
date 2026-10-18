# zahln

An interview MVP of [Zahln / ZYSYGY](https://zysygy.de): zero-fee account-to-account payments over SEPA Instant.
Five front ends on one realistic payment backend:

| | Front end | Stack |
|---|---|---|
| 1 | **Zahln**: consumer wallet app (iOS + Android) | bare React Native 0.88 |
| 2 | **ZYSYGY**: merchant till app (iOS + Android) | bare React Native 0.88 |
| 3 | **Console**: internal ops tool | Vite + React + shadcn/ui |
| 4 | **Zahln Web**: merchant dashboard, consumer web wallet, pay-link checkout | Next.js 16 |
| 5 | **The Zahln Edition**: Editions-style landing page | Next.js 16 + Lenis + Motion + OGL |

> Days 1–4 are built: the API, both mobile apps, and **Act 1**, a real payment from the ZYSYGY till to the Zahln wallet. The web front ends come on Days 6–10.

> Work in progress. The code is built day by day following the guides in [`docs/days`](docs/days/README.md).

## Run it
```bash
cp .env.example .env
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm api                 # API on :4000 (OTP is always 123456 in dev)
pnpm pods                # CocoaPods for both apps
pnpm consumer            # Metro for Zahln on :8081, then: pnpm consumer:ios | consumer:android
pnpm merchant            # Metro for ZYSYGY on :8082, then: pnpm merchant:ios | merchant:android
pnpm console             # Zahln Ops (internal console) on :5174; sign in with your name + ADMIN_TOKEN
```
On Android 16, allow "nearby devices" on first launch of a debug build (it's the local-network access Metro needs).
For faster Android dev builds: `./gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`.

Demo logins: `0151 0000 0001` (Lena, student, in **Zahln**) · `0151 0000 0010` (Mila, Café Mila, in **ZYSYGY**).

![App icons: Zahln and ZYSYGY](docs/screenshots/app-icons.png)

![Act 1: the payment moment](docs/screenshots/act1-payment-moment.png)

![Onboarding](docs/screenshots/showcase-onboarding.png)
![App](docs/screenshots/showcase-app.png)

Design system **"Ember and ink"**: warm paper, near-black ink, one ember accent, a torn-receipt motif, Phosphor icons,
custom SVG illustrations, spring motion and haptics. See [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).

## Docs
- [Plan](docs/PLAN.md): product understanding, demo script, architecture, schedule
- [Tech decisions](docs/DECISIONS.md): every library choice, its trade-offs, and the interview questions it answers
- [Design system "Ember and ink"](docs/DESIGN_SYSTEM.md): light and dark tokens, typography, components
- [Landing page](docs/LANDING.md): teardown of Shopify Editions Winter '26 and the spec for "The Zahln Edition"
- [Daily guides](docs/days/README.md): Day 1 to Day 13

## Stack
Bare React Native 0.88 · TypeScript · NativeWind · React Navigation · TanStack Query · Zustand ·
Fastify · Postgres · Drizzle · Next.js · Vite + React + shadcn/ui · Lenis · Motion · OGL · pnpm + Turborepo · Biome · Vitest · Jest · Maestro · Playwright · Lighthouse CI
