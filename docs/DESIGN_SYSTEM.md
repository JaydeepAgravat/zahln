# Design System — "Quittung"

My own design-system proposal for Zahln / ZYSYGY, in light and dark. It's based on research into payment and fintech
apps (A2A wallets, neobanks, merchant POS), but doesn't copy any brand. Tokens live in `packages/shared/tokens` and are
generated into NativeWind (Tailwind 3) for mobile and CSS variables (Tailwind 4) for the web console
(see [DECISIONS.md §2.1](DECISIONS.md)).

> Every contrast ratio in this doc was recomputed with the WCAG 2.x formula on 2026-10-18. Facts about other apps
> marked **(unverified)** come from general knowledge, not from a source I could open. Check them in the live app
> before quoting them in the interview.

---

## 1. Concept

**Quittung** (German for "receipt") treats every screen like a clean, honest receipt: warm paper background, near-black
**ink**, one bold **ember** brand colour (v2, see §4), and a decisive **green that only appears when money has actually moved**.

Why it fits Zahln:
- **Trust-first and European.** It borrows from the things Germans already trust about money: the Kassenbon, the
  Mensa card, the bank statement. Precise, typographic, calm. There's no flashy "premium fintech" gradient for a
  zero-fee product to explain.
- **Different from everyone nearby.** Wero is yellow, TWINT black, Wise green, Monzo coral, N26 teal, Nubank purple.
  Ember on ink is warm, confident and unmistakable on a home screen.
- **Campus warmth without noise.** One **saffron** accent, used only for decoration (onboarding, illustrations,
  Mensa promos), never for status. So students learn that colour always means something.

---

## 2. Principles (say these in the interview)

1. **Green means money moved, nothing else.** The brand colour is ember, so it can never be mistaken for "paid".
2. **The amount is the hero.** It's the largest text on every payment screen, uses tabular figures, and is
   locale-correct: `6,30 €`, not `€6.30`.
3. **Readable from an arm's length in a Mensa queue.** The merchant confirmation must be readable at a glance from about a metre away,
   with haptics and sound as backup.
4. **Every state says what happened to your money.** "Nicht belastet" (not charged) beats "Fehler" (error).
5. **Live, not static.** Expiring codes, ticking timestamps and subtle motion make screenshots worthless.
6. **Follow the phone.** System dark mode, Dynamic Type and Reduce Motion are respected by default.
7. **Celebrate in under 1.5 seconds, then get out of the way.** The queue matters more than the animation.
8. **Calm by default, expressive at the edges.** Accent colour and illustration live in onboarding and campus
   moments, never in money flows.

---

## 3. What I learned from other products

| Product | Pattern worth borrowing | How Quittung uses it |
|---|---|---|
| **Wise** | Semantic token layer on top of base colours; a brand colour that is *not* the success colour | Base → semantic tokens; ember brand, green for success only |
| **Monzo** | Expressive brand in marketing, calm product UI | Principle 8 |
| **N26** | Dark mode follows the system; a "discreet mode" that hides balances | `AmountDisplay` discreet mask (`•••,•• €`) for queues where people stand close together |
| **TWINT** | QR codes on its web checkout expire after 5 minutes; the confirm screen always shows amount, merchant and time | 5-minute QR with countdown; confirmation always shows all three |
| **TWINT / UPI** (unverified) | Live animated elements so a cashier can tell a live screen from a screenshot; UPI "soundbox" reads the amount aloud | Ticking seconds plus a moving border sheen; a chime on the merchant side |
| **Swish** | QR always black on white with a centred logo | QR sits on white in both themes |
| **Pix** | Dynamic QR codes carry the payee's name, institution and tax ID; a copy-paste text fallback | Payee shown from the server; a copy-able payment link as fallback |
| **Square** | The till is checkout-only: Keypad and Library (catalogue) tabs at top, everything else under "More" | Till has **Katalog / Betrag** tabs; reports and settings one level down |
| **Stripe Terminal** | The customer sees the live cart on the merchant device before paying | Line items above the QR |
| **Google Wallet** (2025) | A loader turns into a check, then a colour flood; German press criticised long celebrations at the till | Under 1.5 s and dismissible (principle 7) |
| **Apple HIG** | 4.5:1 minimum contrast (7:1 for small text); in dark mode, sheets sit on a lighter "elevated" surface; distinct success, warning and error haptics | Contrast table below; dark surfaces step up; haptics per status |
| **Material** | Dark grey rather than true black; lighter surfaces instead of shadows; desaturated colours on dark | Dark theme uses near-black `#111214` with lighter, desaturated tones |
| **ISO/IEC 18004, EPC069-12** | QR quiet zone of 4 modules; EPC payment QR uses error correction M | QRPanel spec |

---

## 4. Colour tokens: v2 "Ember and ink"

> **v2 (2026-10-18):** the palette moved from ink-indigo to **Ember and ink**: bolder, warmer, and distinct
> from every EU neobank (Wise green, N26 teal, Revolut black, Monzo coral). The principles above are unchanged.
> Source of truth: `packages/shared/src/tokens/index.ts`. Every text pair below is enforced by a unit test
> (`packages/shared/test/plans-tokens.test.ts`), so a token change that breaks AA fails CI.

**Decisions worth saying out loud:**
- **Text on ember is ink, not white.** White on `#FF4F1F` is 3.3:1 (fails AA); ink is 5.3:1. It also looks more modern.
- **Ember is never a text colour on paper.** Small brand-coloured text uses `brandText` `#B8340A` (5.4:1).
- **Danger is raspberry `#C2183B`**, deliberately far from ember, so the brand never reads as an error.
- **Green still only means "money moved"** (`success`, `floodPaid`).
- **The ink card stays dark in both themes.** It's the "receipt" object of the brand.

### Light
| Token | Hex | Notes |
|---|---|---|
| `bg` | `#F7F3EE` | warm paper |
| `surface` / `surfaceRaised` | `#FFFDFA` / `#FFFFFF` | |
| `surfaceMuted` | `#EFE7DD` | key caps, icon tiles, skeletons |
| `border` / `borderStrong` | `#E6DED3` / `#8F877C` | borderStrong ≥ 3:1 |
| `textPrimary` / `Secondary` / `Tertiary` | `#1B1A17` / `#5E574E` / `#736B60` | 15.8 / 6.5 / 4.75 on bg |
| `brand` (ember) / `onBrand` | `#FF4F1F` / `#1B1A17` | 5.3:1 |
| `brandText` / `brandSubtle` | `#B8340A` / `#FFE2D6` | |
| `ink` / `onInk` / `onInkMuted` | `#1B1A17` / `#F7F3EE` / `#B3ACA2` | balance card, profile header |
| `accent` (saffron) / `accentText` / `accentSubtle` | `#F5A524` / `#8A5300` / `#FCEFD6` | sparkles, dev hints |
| `success` / `successSubtle` | `#16784A` / `#DDF3E6` | 4.7:1 |
| `warning` / `warningSubtle` | `#8F5100` / `#FBEBD3` | |
| `danger` / `dangerSubtle` | `#C2183B` / `#FCE4E8` | 5.0:1 |
| `info` / `infoSubtle` | `#2357C9` / `#E3EBFB` | |
| `pending` / `pendingSubtle` | `#6B6458` / `#EFE9E0` | |
| `floodPaid` / `floodNotCharged` (white text) | `#137A45` / `#B3203F` | 5.4 / 6.6 |

### Dark
| Token | Hex |
|---|---|
| `bg` / `surface` / `surfaceRaised` / `surfaceMuted` | `#121110` / `#1B1A18` / `#252320` / `#2C2925` |
| `border` / `borderStrong` | `#34312C` / `#7A736C` |
| `textPrimary` / `Secondary` / `Tertiary` | `#F5F0E9` / `#BEB6AB` / `#9A9286` |
| `brand` / `onBrand` / `brandText` / `brandSubtle` | `#FF6A3D` / `#1B1A17` / `#FF8A63` / `#3A2118` |
| `ink` / `onInk` / `onInkMuted` | `#252320` / `#F5F0E9` / `#BEB6AB` |
| `success` / `danger` / `warning` / `info` / `pending` | `#3DD68C` / `#FF6B81` / `#F2B54A` / `#7AA7FF` / `#B4AC9F` |

### Brand mark and app icon
A **receipt with a torn edge carrying a bold Z**: the "Quittung" concept in one shape.
- iOS: ember tile + paper receipt (light), ink tile + ember receipt (dark), white receipt (tinted).
- Android: adaptive icon (ember background, receipt foreground in the 66 dp safe zone) plus a monochrome layer for themed icons.
- Splash: ink background with the ember tile, on both platforms.

![App icons: Zahln light and dark, ZYSYGY light and dark](screenshots/app-icons.png)

### Icons
**Phosphor** (MIT), one family, curated in `apps/mobile/src/ds/Icon.tsx`.
- Each icon is imported by file path, so only the ~37 icons used are in the bundle, not 1,500.
- Weights carry meaning: `regular` for navigation and inactive states, `fill` for active tabs and status, `duotone` for category tiles and quick actions, `bold` inside buttons.

### Illustrations
Custom geometric SVG drawn in code from the tokens (`apps/mobile/src/ds/illustrations.tsx`), so they re-theme in dark mode
and are never stock art. The shared vocabulary:
- an ink phone with a one-time QR
- a paper receipt with a torn edge
- the ember coin or sun
- saffron sparkles

Animated, all with Reduce Motion support: a gentle float on Welcome and OTP, and a scan line on Face ID.

### Motion and haptics
- **Spring press scale on every tappable surface** (`PressableScale`). It runs on the UI thread via Reanimated.
- **Staggered fade-up** for screen content and list rows.
- **PIN dots:** a pop on fill and a shake on error. With Reduce Motion on, they just turn red.
- **Skeletons** pulse instead of showing spinners.
- **Haptics map to outcomes:** a tap for keys, selection for tabs and segments, success when money moves or a step completes, error for refusals.

## 5. Typography

- **UI font: Inter** (SIL OFL 1.1, free): Regular, Medium, SemiBold, Bold. Full German coverage, tabular figures.
- **Headlines and amounts: Inter Bold** with tight tracking (`hero` 36/40, `amountHero` 48/54), always with tabular numerals
  for amounts. (Google Fonts doesn't serve a static Inter Display cut.)
- **Formatting:** always `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })` → `6,30 €` (no-break
  space); English → `€6.30`. Never build the string by hand.
- **Cents:** the same size as euros on the till and in confirmations; the consumer wallet balance may show cents
  at 60 % size in secondary colour.

| Style | Size / line height | Weight | Notes |
|---|---|---|---|
| `amount-hero` | 56 / 60 | 600 | tnum, −2 % tracking |
| `amount-lg` | 40 / 44 | 600 | tnum |
| `display` | 32 / 38 | 600 | |
| `title` | 24 / 30 | 600 | |
| `headline` | 20 / 26 | 600 | |
| `body` | 17 / 24 | 400 | iOS default size |
| `callout` | 15 / 20 | 400 / 500 | |
| `footnote` | 13 / 18 | 400 | |
| `caption` | 12 / 16 | 500 | +2 % tracking |
| `keypad-digit` | 28 / 32 | 500 | tnum |

All styles scale with Dynamic Type / Android font scale. `amount-hero` caps at 1.5× and then wraps the currency onto its
own line instead of truncating.

---

## 6. Spacing, radius, elevation, motion

- **Spacing (4-pt base):** 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Screen gutter 20. Minimum touch target 48;
  keypad keys at least 64.
- **Radius:** xs 4 (badges) · sm 8 (inputs) · md 12 (list cards) · lg 16 (cards, sheets) · xl 24 (QR panel) · full
  (pills, buttons). QR modules stay square.
- **Elevation, light:**
  - e1: `0 1px 2px rgba(21,22,26,.06), 0 1px 1px rgba(21,22,26,.04)`
  - e2 (sheets): `0 8px 24px rgba(21,22,26,.10)`
- **Elevation, dark:** no shadows. Step bg → surface → surface-raised, plus a 1 px top hairline `rgba(255,255,255,.06)`.
- **Motion:**

  | Token | Value |
  |---|---|
  | `instant` | 80 ms |
  | `fast` | 150 ms |
  | `base` | 240 ms |
  | `slow` | 400 ms |
  | `celebrate` | 600 ms (whole paid sequence ≤ 1.2 s) |

  - Easing: standard `cubic-bezier(.2,0,0,1)`, enter `(0,0,0,1)`, exit `(.3,0,1,1)`; the checkmark uses a spring
    with damping ratio ~0.7.
  - **Reduce Motion:** the flood becomes a 120 ms crossfade, the checkmark is static, and the countdown ring becomes a
    text timer. Haptics and sound always stay, because they carry meaning without motion.

---

## 7. Components

### AmountDisplay
- Variants: `hero`, `lg`, `inline`. Tabular figures, stable width, locale formatting.
- `discreet` prop masks the value (`•••,•• €`).
- The screen-reader label reads the amount naturally ("sechs Euro dreißig"), not "6 comma 3 0".

### Keypad
- 3×4 grid: 1–9, `00`, 0, ⌫ (no comma key: entry is cents-first). Keys at least 64 pt; a light haptic on every press.
- **Fills from the cents side:** typing 6 → 3 → 0 gives `0,06 → 0,63 → 6,30 €`, so there are no comma mistakes. Long-press ⌫ clears.
- Primary button below: **"6,30 € kassieren"**, disabled at 0.
- The till has **Katalog / Betrag** tabs.

### QRPanel
- The QR sits on `#FFFFFF` in both themes, with a quiet zone of at least 4 modules and error correction M. It's ~70 % of screen width, at least 240 pt.
- Screen brightness goes to max while it's shown and is restored on exit.
- Above the QR: amount, merchant name, location, line items. Below: a countdown ring plus **"Noch 4:12"** (mm:ss). The ring turns
  warning colour in the last 30 s. When the code expires, a new one is generated automatically, with a "Neu erstellt" toast.
- "Live" cues: a slow sheen on the border and ticking seconds. Real anti-fraud is the one-time server token; these cues stop someone showing an old screenshot.

### Payment status screens

| Status | Treatment | Haptic |
|---|---|---|
| **Bezahlt** (paid) | Full-bleed `flood-paid`, checkmark, `amount-hero`, merchant, live time with seconds. The till returns automatically after 2.5 s, or tap to stay. The customer and merchant screens look the same, so a cashier can check at a glance. | success + short chime |
| **Wird geprüft** (checking) | `pending-subtle` background, a calm indeterminate ring, "Dauert meist 3 Sekunden". **No warning colours.** | none |
| **Nicht belastet** (not charged) | `flood-not-charged`, a plain reason, **"Kein Geld abgebucht"** stated explicitly, primary "Erneut versuchen". | error |
| **Abgelaufen** (expired) | Neutral surface, a muted QR illustration, warning badge, "Neuen Code anzeigen". | warning |

### ListRow (transaction)
- At least 64 pt high: 40 pt merchant avatar, title (body/500), subtitle (footnote, secondary: "Mensa Augsburg · 12:41").
- Trailing amount is tabular and right-aligned. Incoming is shown as `+` in success; outgoing in `text-primary`, **never red**
  (spending money isn't an error).
- A StatusBadge appears only when the status isn't "Bezahlt".

### StatusBadge
- A pill at caption size, with a subtle background, solid text **and an icon**, so the status never relies on colour alone.
- Variants: success, pending, warning, danger, info, neutral.

### Button

| Variant | Treatment |
|---|---|
| `primary` | brand fill, on-brand text |
| `secondary` | brand-subtle fill, brand text |
| `tertiary` | text only, brand colour |
| `destructive` | danger fill |
| `pay` | full width, 56 pt, Face ID glyph: **"Mit Face ID bezahlen · 6,30 €"** |

- Heights: 56 / 48 / 40. Radius: full.
- Focus ring: 2 pt brand with a 2 pt offset.

### Also in the primitive set
Text, Card, Sheet (`@gorhom/bottom-sheet`), Countdown, Toast, Screen (safe area + gutter + SecureScreen opt-in).

---

## 8. Theme switching

- Default: follow the system appearance (Apple HIG), via `useColorScheme()`.
- Dev and Storybook: a theme toggle so every story is reviewed in light **and** dark. In the demo, switch the simulator's
  appearance live; it's an easy way to show both themes in five seconds.

---

## 9. Likely interview questions

- **"Why not green as the brand colour, like Wise?"** → Principle 1: green has to mean "money moved".
- **"How do you design for dark mode?"** → Not an inversion: near-black base, lighter elevated surfaces instead of shadows,
  desaturated tones, every pair re-checked for contrast. The QR stays black on white.
- **"How do you stop someone paying with a screenshot of a confirmation?"** → Server-confirmed status on the merchant
  device is the truth; the customer screen adds live seconds and motion, so a screenshot looks dead.
- **"How do you make a payment screen accessible?"** → Amounts are read naturally by screen readers; status uses an icon plus text plus
  colour; keys are at least 64 pt; Dynamic Type up to 1.5× with wrapping; Reduce Motion keeps haptics.
- **"What does German do to your layouts?"** → ~30 % longer strings, the comma decimal, `6,30 €` placement; buttons
  grow and wrap rather than truncate.

---

## Sources
Apple HIG ([Dark Mode](https://developer.apple.com/design/human-interface-guidelines/dark-mode),
[Haptics](https://developer.apple.com/design/human-interface-guidelines/playing-haptics)) ·
[Material dark theme](https://m2.material.io/design/color/dark-theme) ·
[Wise rebrand](https://www.creativereview.co.uk/wise-rebrand-ragged-edge/) ·
[Wise Sans](https://type-01.com/wise-sans-the-font-update-shaping-wises-visual-identity/) ·
[Monzo brand](https://www.creativereview.co.uk/monzo-branding-ragged-edge/) ·
[N26 dark mode](https://n26.com/de-de/blog/dark-mode-jetzt-erhaeltlich-fuer-deine-n26-app) ·
[Wero brand center](https://wero-wallet.eu/brand-center) ·
[TWINT via Checkout.com](https://www.checkout.com/docs/payments/add-payment-methods/twint/payment-setup-api) ·
[Vipps MobilePay guidelines](https://developer.vippsmobilepay.com/docs/knowledge-base/design-guidelines/) ·
[Swish via Ping Payments](https://docs.pingpayments.com/docs/swish-1) ·
[Pix standards (BCB)](https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf) ·
[NPCI UPI circular](https://www.npci.org.in/PDF/npci/upi/circular/2024/UPI-OC-190-FY-23-24-Reiteration-of-compliance-to-OC-163-OC-163A-and-OC-100.pdf) ·
[Google Wallet animation](https://9to5google.com/2025/08/14/google-wallet-m3-expressive-animation/) ·
[EPC QR guidelines](https://europeanpaymentscouncil.eu/sites/default/files/kb/file/2022-09/EPC069-12%20v3.0%20Quick%20Response%20Code%20-%20Guidelines%20to%20Enable%20the%20Data%20Capture%20for%20the%20Initiation%20of%20an%20SCT_0.pdf) ·
[SumUp Circuit UI](https://github.com/sumup-oss/circuit-ui) ·
[Square POS update](https://community.squareup.com/t5/Product-Updates/Reintroducing-Square-Point-of-Sale/ba-p/362286) ·
[Stripe Terminal display](https://docs.stripe.com/terminal/features/display) ·
[Inter](https://rsms.me/inter/)
