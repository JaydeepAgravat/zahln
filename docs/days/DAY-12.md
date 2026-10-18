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

## As built (deviations and honest caveats)
| Plan said | What happened | Why |
|---|---|---|
| Web Storybook for `web-ui` | Storybook 10 (Vite) with the a11y addon (`a11y.test: 'error'`) and a light/dark toolbar on `data-theme`, the same Tailwind theme as the apps; stories for every primitive; `pnpm storybook`, built in CI | Checkout outcome pages aren't stories yet (they live in `apps/web`) |
| Mobile Storybook (`@storybook/react-native` 10) | Config in `packages/mobile-ui/.rnstorybook`, stories in `src/stories` (primitives, money, keypad, list rows, wallet, countdown, Bezahlt), each in **light, dark and English**, inside the apps' real providers; `pnpm --filter @zahln/consumer storybook` (= `STORYBOOK=1` Metro) | No on-device control addons (they need native pickers); theme and language are separate stories instead |
| Storybook never ships | `withStorybook({ enabled: STORYBOOK === '1' })` empties every `@storybook` module and the config folder; the entry reads `.rnstorybook/enabled` and gets `undefined` | Checked: the production bundle has no Storybook code, only the wrapper's 20-line stub |
| Accessibility pass | axe (WCAG 2.2 AA) in Playwright on every web page **in light and dark**: login, pay link, all 8 dashboard pages, wallet, devices, and the console. Found and fixed: the danger button and toasts (white on light raspberry in dark mode, < 3:1) → page-colour text | Zero violations now |
| Screen readers (mobile) | Every payment outcome is now **announced** (`announceForAccessibility`), not just "Bezahlt": `accessibilityLiveRegion` is Android-only, so iOS was silent on "Nicht belastet" / "Wird geprüft" | Not yet walked through end to end with VoiceOver/TalkBack by hand |
| Reduce Motion | The countdown ring becomes plain text, the check stops drawing and zooming (the flood was already a crossfade) | |
| Maestro | `apps/consumer/e2e/happy-path.yaml` and `network-drop.yaml` **pass on the iOS simulator**: a till intent via the API, `zahln://i/…` link, PIN, Bezahlt, and exactly one ledger transaction (also after `drop_after_settle`). `apps/merchant/e2e/till-to-paid.yaml` written, **not run** (needs ZYSYGY signed in on the simulator) | Found: amounts are read as "6 Euro 30 Cent", and `Intl` puts a no-break space before €, so flows match on the button text with a wildcard |
| Playwright: console refund + audit | `console.spec.ts`: sign in, search "6,30", refund 1,00 € with a reason, the audit row shows the operator and reason, axe on every console page. **8/8 Playwright specs green** | |
| CI | `.github/workflows/ci.yml`: Biome (`biome ci`), typecheck, all unit/API tests with Postgres as a service (waits for `pg_isready`), the Storybook build, Playwright against a started API + web + console (Chrome on the runner), Lighthouse CI for the landing page | Not run on GitHub yet (it runs on the next push); Maestro stays local (macOS runners are "next") |
| Deploy previews | Not set up | Needs a hosting account; never created on the user's behalf |

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
