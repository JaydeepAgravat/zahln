# Daily build guides

One file per day. Each one has the same sections:

1. **Goal**: the one sentence you should be able to say at the end of the day.
2. **Why it matters for the interview**: which JD line this day proves.
3. **Concepts to understand first**: read these before touching code. If you can't explain them, you can't defend the code.
4. **Tasks**: checklist, in order.
5. **Files you'll create**: so you know where things live.
6. **Commands**: what to run.
7. **Pitfalls**: what usually goes wrong.
8. **Done when**: the end-of-day check. Don't move on until it passes.
9. **Interview drill**: questions to answer out loud (no notes) before you sleep.
10. **Commit**: suggested commit message(s).

| Day | Theme | Milestone |
|---|---|---|
| [Day 1](DAY-1.md) ✅ | Monorepo, shared package, API, ledger, idempotency, rail simulator | `curl` a payment end to end |
| [Day 2](DAY-2.md) ✅ | React Native app, Ember & ink design system, i18n, onboarding, PIN, biometrics | Onboard on two simulators |
| [Day 3](DAY-3.md) | Split into **Zahln** + **ZYSYGY** apps on `mobile-ui` + `mobile-core` | Both apps on one home screen |
| [Day 4](DAY-4.md) | Merchant till, dynamic QR, scan → pay, SSE, receipts, wallets | **Act 1** |
| [Day 5](DAY-5.md) | Every payment state, `checking` reconciliation, chaos, static QR, tips, refunds | **Act 2** |
| [Day 6](DAY-6.md) | Remote config, plan gating, kill switches, forced update, internal console | **Act 3** |
| [Day 7](DAY-7.md) | Zahln Web I: web auth, `web-ui`, merchant dashboard | Payments appear live on the dashboard |
| [Day 8](DAY-8.md) | Zahln Web II: pay-link checkout, consumer web wallet, Playwright | Pay a link in a browser |
| [Day 9](DAY-9.md) | The Zahln Edition I: content, CC0 art, lettering, static layout | Reads perfectly with JS off |
| [Day 10](DAY-10.md) | The Zahln Edition II: motion, shader, Lighthouse CI budgets | Budgets green |
| [Day 11](DAY-11.md) | Native modules (SecureScreen, NFC HCE), security hardening | Security checklist |
| [Day 12](DAY-12.md) | Storybook, accessibility, Maestro + Playwright, one CI pipeline | CI green on a clean clone |
| [Day 13](DAY-13.md) | ADRs, README, video, rehearsal | 5-minute demo, no surprises |

Related docs: [PLAN.md](../PLAN.md) · [DECISIONS.md](../DECISIONS.md) · [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) · [LANDING.md](../LANDING.md)

**Daily rhythm (full-time):**

| When | What |
|---|---|
| 1 h | Read the concepts section and sketch the day's data flow on paper |
| 5–6 h | Build |
| 1 h | Tests and the "Done when" check |
| 30 min | Interview drill out loud, update notes, commit and push |
