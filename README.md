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

> Days 1–2 are built (today there's one RN app with two modes in `apps/mobile`; Day 3 splits it into two apps).

> Work in progress. The code is built day by day following the guides in [`docs/days`](docs/days/README.md).

## Run it
```bash
cp .env.example .env
pnpm install
pnpm db:up && pnpm db:migrate && pnpm db:seed
pnpm api          # API on :4000 (OTP is always 123456 in dev)
pnpm mobile       # Metro
cd apps/mobile/ios && pod install && cd -
pnpm --filter @zahln/mobile ios       # or: android
```
Demo logins: `0151 0000 0001` (Lena, student) · `0151 0000 0010` (Mila, Café Mila).

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
