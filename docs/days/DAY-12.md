# Day 12: Quality across all five front ends

## Goal
"Every primitive is in Storybook in light and dark. A screen reader can complete a payment in both apps and on
the web. Maestro and Playwright run the critical paths. One CI pipeline checks everything on a clean clone."

## Why it matters for the interview
- JD: *"Automated testing that runs on real devices."* / *"You have made an app genuinely accessible."*
- Five front ends without a single pipeline would be five ways to regress. This day makes it one product again.

---

## Concepts to understand first

### 1. Storybook in two worlds
- Mobile: `@storybook/react-native` 10 inside `packages/mobile-ui`, launched through a `STORYBOOK=1` entry in the
  consumer app, so it never ships in release builds.
- Web: Storybook for `packages/web-ui` (Vite builder). Both use the same controls: theme, locale and font scale (or
  text zoom).

### 2. Accessibility checklist per surface
| Surface | Must pass |
|---|---|
| Both apps | Role + label on every control; spoken money ("sechs Euro dreißig"); status announcements; largest Dynamic Type with no truncation in money flows; Reduce Motion |
| Zahln Web + console | axe clean (Playwright `@axe-core/playwright`); keyboard-only completion; focus visible; tables have captions/headers |
| Landing | Lighthouse a11y 100 (Day 10); pause control; reading order |

### 3. E2E strategy
- **Maestro** (mobile), with the dev "PIN only" path or `xcrun simctl` to match Face ID:
  - `consumer/happy-path.yaml`
  - `consumer/network-drop.yaml`
  - `merchant/till-to-paid.yaml`
- **Playwright** (web): the Day 8 specs + `console/refund.spec.ts` + axe on every page.
- CI runs unit tests, typecheck, lint, Playwright, Lighthouse CI and API tests with Postgres as a service container.
  Maestro runs locally (macOS CI runners are "next").

---

## Tasks

### A. Storybook (≈2 h)
- [ ] Mobile: stories for every `mobile-ui` primitive + payment outcome screens in every state, light and dark
- [ ] Web: stories for `web-ui` components + the checkout outcome pages

### B. Accessibility pass (≈2.5 h)
- [ ] Both apps: VoiceOver + TalkBack complete a payment; status changes announced (`announceForAccessibility("Bezahlt, 6,30 Euro")`)
- [ ] Largest Dynamic Type on every money screen; Reduce Motion: the flood becomes a crossfade, the countdown ring becomes text
- [ ] QR panel focus order: amount → merchant → time left → actions
- [ ] Web: axe in every Playwright spec; keyboard-only dashboard refund; console ⌘K reachable by keyboard

### C. E2E (≈2 h)
- [ ] Maestro flows for both apps
- [ ] Playwright: console refund + audit row

### D. CI + previews (≈1.5 h)
- [ ] `.github/workflows/ci.yml`: install (pnpm cache) → Biome → typecheck → Vitest/Jest → API tests (Postgres service) → Playwright → Lighthouse CI
- [ ] Turbo remote cache off (local only); `--filter=...[origin/main]` for affected-only runs
- [ ] Optional: deploy previews for `landing` and `web` (only if the user sets up a hosting account; never create accounts on their behalf)

---

## Files you'll create
```
packages/mobile-ui/.storybook/*  packages/mobile-ui/src/**/*.stories.tsx
packages/web-ui/.storybook/*     packages/web-ui/src/**/*.stories.tsx
apps/consumer/e2e/*.yaml  apps/merchant/e2e/*.yaml
apps/console/e2e/*.spec.ts
.github/workflows/ci.yml
```

## Commands
```bash
STORYBOOK=1 pnpm consumer:ios
pnpm --filter @zahln/web-ui storybook
maestro test apps/consumer/e2e/happy-path.yaml
pnpm turbo run test typecheck lint
```

## Pitfalls
- **Storybook leaking into production.** Make sure the release bundle doesn't import it.
- **Flaky E2E from infinite animations:** use the test flag that makes animations finite (as on Day 2 for uiautomator).
- **CI Postgres race:** wait for `pg_isready` before migrations.

## Done when
- [ ] Storybook (mobile + web) shows every component in light and dark
- [ ] VoiceOver completes a payment in Zahln; TalkBack completes one at the ZYSYGY till
- [ ] All Maestro flows pass locally; all Playwright specs pass with zero axe violations
- [ ] CI is green on a fresh clone

## Interview drill
1. "How did you test with a screen reader? What did you have to change?"
2. "What runs in CI, and what doesn't yet, and why?"
3. "How do you keep five front ends visually consistent?"

## Commit
```
feat(ds): Storybook for mobile-ui and web-ui
fix(a11y): screen reader, Dynamic Type and reduced motion pass across apps and web
test(e2e): Maestro flows for both apps, Playwright for console
ci: one pipeline for lint, types, unit, API, Playwright and Lighthouse
```
