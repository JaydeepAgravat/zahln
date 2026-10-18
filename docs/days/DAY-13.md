# Day 13: Tell the story (ADRs, README, video, rehearsal)

## Goal
"Anyone who opens the repo understands the product, the architecture and my decisions in five minutes, and I can run
the 5-minute demo twice in a row with no surprises."

## Why it matters for the interview
- JD: *"Nobody reviews your architecture before you commit to it."* ADRs show you document decisions without being asked.
- JD: *"You have taste and you defend it."* / India JD: *"You write clearly and work well remotely."*
- A rehearsed demo is worth more than any extra feature. **No new features today.**

---

## Concepts to understand first

### 1. What an ADR is
One page per decision:
```
# ADR-002: Never auto-retry a payment
Status: Accepted · Date: 2026-10-24
## Context        (the constraint, in 3–5 lines)
## Decision       (one paragraph, starting with "We will…")
## Consequences   (good, bad, and what we'll watch)
## Alternatives considered
```
The ADRs below come straight from [DECISIONS.md](../DECISIONS.md). Condense them; don't repeat it.

### 2. A README that sells
Reviewers spend under two minutes on it. Order:
1. A one-line pitch + a GIF of Act 1
2. "What this demonstrates" (the JD → MVP table from PLAN.md)
3. Architecture diagram
4. Run it in 3 commands
5. Demo script
6. Links to ADRs, DECISIONS, DESIGN_SYSTEM, SECURITY
7. "What I'd do next" (a short, prioritised list)

### 3. Demo risk management
Live demos fail because of state, network, and nerves. Defences: a `demo:reset` script, a checklist, a backup video,
and knowing what to say if something breaks. A failure during Act 2 is a feature: "this is exactly why the app says Wird geprüft".

---

## Tasks

### A. ADRs (≈2 h) in `docs/adr/`
- [ ] `001-bare-react-native.md`: bare vs Expo, and how to migrate to their Expo stack
- [ ] `002-payment-states-and-retries.md`: state machine, idempotency, reconciliation, and the honest offline options
- [ ] `003-server-driven-config.md`: kill switches vs flags vs plan features, defaults, forced update
- [ ] `004-nfc-ios-android.md`: Android HCE vs iOS EEA HCE entitlement vs Tap to Pay on iPhone
- [ ] `005-payment-rail-adapter.md`: simulator now, PSP later, why no sandbox in week one
- [ ] `006-data-residency-and-records.md`: EU-only telemetry, scrubber, GoBD receipt numbering, ledger retention vs deletion
- [ ] `007-two-apps-shared-packages.md`: why Zahln and ZYSYGY are separate apps, what's shared, what it costs
- [ ] `008-web-auth.md`: httpOnly cookie + CSRF on the web, device-bound bearer on mobile, staff identity for the console
- [ ] `009-landing-performance-budget.md`: one OGL shader instead of Three.js, Lighthouse CI budgets, reduced motion

### B. README + diagrams (≈1.5 h)
- [ ] Root `README.md` in the order above
- [ ] Architecture diagram (Mermaid in the README: Zahln + ZYSYGY apps, Zahln Web, console, landing ↔ API ↔ Postgres, rail, SSE)
- [ ] Sequence diagram for "pay with a dropped response" (Mermaid)
- [ ] Screenshots of both apps in light + dark, de + en (2×2 grid), the dashboard, the checkout, the console, and a landing page strip
- [ ] GIFs: Act 1 (≤ 10 s), Act 2 (≤ 15 s). Record with `xcrun simctl io booted recordVideo`, convert with `ffmpeg`
- [ ] "What I'd do next":
  - [ ] Expo migration
  - [ ] Hardware-key SCA with dynamic linking
  - [ ] Sentry EU
  - [ ] Real PSP adapter
  - [ ] Real KYC partner flow
  - [ ] iOS HCE entitlement
  - [ ] Play Integrity / App Attest

### C. Video (≈1.5 h)
- [ ] 2-minute Loom/QuickTime: 15 s landing page scroll → Act 1 → Act 2 → Act 3 → 15 s "why these decisions"
- [ ] Script it (below), record twice, keep the better take, add captions
- [ ] Unlisted link in the README and in your follow-up message to the founder

### D. Rehearsal (≈2 h)
- [ ] `docs/DEMO.md`: the exact click path, what to say, the fallback for each act
- [ ] Pre-flight checklist:
  - [ ] Docker up
  - [ ] `pnpm demo:reset`
  - [ ] Zahln + ZYSYGY simulators booted and logged in
  - [ ] Browser tabs: landing (top of page), Zahln Web dashboard (Café Mila), console on the Control room
  - [ ] Chaos off
  - [ ] Notifications off
  - [ ] Battery/Wi-Fi icons clean (`xcrun simctl status_bar booted override --time 9:41`)
- [ ] Run the full demo twice, timed. Then once while explaining it out loud to a friend or a recording.
- [ ] Clean up the repo:
  - [ ] No secrets
  - [ ] `.env.example` complete
  - [ ] Fresh-clone test: `git clone` into `/tmp` → follow the README → it runs
- [ ] Final push; tag `v0.1-interview`

---

## Demo script (the words)

**Opening (15 s)**
"Zahln's whole company is the three seconds in the Mensa queue. So I built that moment, and the three things that go
wrong around it."

**Act 1 (90 s)**
"Café Mila's till. Cappuccino and croissant, 6,30. The QR is unique to this payment and valid for five minutes. You can see
the countdown. Lena scans, sees the merchant and amount *from our server, not from the QR*, Face ID… paid. Both phones
at once. 840 milliseconds from Face ID to confirmation, measured, not guessed."

**Act 2 (2 min)**
"Now campus wifi. I tell the rail to settle and then drop the response. That's the worst case: money moved, the phone doesn't know.
Watch: no 'failed', no retry. *Wird geprüft.* It asks the server with the same idempotency key… *Bezahlt*, charged once.
And when the bank really rejects it: *Nicht belastet*. The first line always says what happened to your money."

**Act 3 (90 s)**
"You can't hotfix a phone. So: Café Mila goes from Free to Pro, and dynamic QR appears. NFC has a bug? Kill switch, the button's
gone. A security issue? Minimum version, and old apps are blocked. Lower it, and they recover. No release needed."

**Close (15 s)**
"Every one of these is a decision I'd make in week one. The ADRs are in the repo. I'd love to argue with you about them."

## Fallbacks
| If… | Then… |
|---|---|
| A simulator crashes | Switch to the video at that act's timestamp |
| The API dies | `pnpm api`; the app shows its offline banner meanwhile: "this is the cached config path" |
| SSE is slow | The till falls back to polling within 2 s: "this is why SSE is only a hint" |
| You blank | Open DEMO.md on a second screen |

## Done when
- [ ] Nine ADRs, a README with GIFs + diagrams, DEMO.md, SECURITY.md
- [ ] The video is recorded and linked
- [ ] Two timed runs under 5:30 each with no surprises
- [ ] A fresh clone runs by following the README
- [ ] Tag `v0.1-interview` pushed

## Interview drill (final)
Answer every "Interview drill" question from Days 1–6 out loud, without notes. Mark any you hesitate on and reread
that day's concepts section. Then prepare your **questions for them** (PLAN.md → Interview prep).

## Commit
```
docs: ADRs 001-006
docs: README with architecture, demo GIFs and run instructions
docs: demo script, rehearsal checklist and security checklist
chore: release v0.1-interview
```
