# Landing page: "The Zahln Edition"

The landing page is modelled on the *mechanics* of Shopify Editions Winter '26 ("The Renaissance Edition"),
not its content or assets. This doc has two parts: a teardown of how their page works (studied in a browser on
2026-10-18), then the spec for ours.

---

## Part 1: Teardown of shopify.com/editions/winter2026

### Stack (observed at runtime)
| What | Evidence | Why it matters to us |
|---|---|---|
| React Router / Remix SSR | `__remixContext`, `__reactRouterVersion` on `window` | Server-rendered HTML first, hydrated after. Content is crawlable and paints before JS. |
| Lenis smooth scroll | `window.lenis`, `lenisVersion` | One scroll source that every scroll-linked effect reads, so effects don't jitter against native scroll. |
| Three.js | `__THREE__`; a 2048×1536 WebGL canvas behind the chapter hero | Chapter art is a shader-driven layer (sparkles, parallax), not a flat `<img>`. |
| Tailwind | Class names everywhere (`grid-cols-subgrid`, `content-visibility-auto`) | Utility CSS, container queries (`cqw`, `cqi`), CSS subgrid. |
| Self-hosted fonts | NeueMontreal 700, HWCigars 400, ImperialScript 400, Inter Variable | Three voices: grotesk display, editorial serif, script swash. |
| 12 `<video>`, ~345 `<img>`, ~124 `<svg>` | Autoplay, muted, loop, with poster; lazy below the fold | Product is *shown moving*, inside device frames. |

The page is about **46,500 px tall**: 12 chapters with around 150 product updates.

### Anatomy
1. **Fixed top bar.** Wordmark + "Winter '26" on the left, an "Editions" dropdown and Search in the middle, and a
   solid pill CTA ("Start for free") on the right. The bar sits on a transparent background over the dark art.
2. **Intro: the framed title.** A 340×464 portrait-ratio frame, drawn as an SVG `<rect pathLength=1>` (so a
   stroke-dashoffset animation can draw it), floats over a full-bleed painting. Inside the frame are the edition
   title, set as **SVG paths** (custom lettering with a swash "a", not live text, plus an `sr-only` text copy),
   a one-line serif subtitle ("A new world of commerce. 150+ product updates."), and the chapter list. Thin
   construction lines ("davinci-lines") extend from the frame like a drawing grid.
3. **The frame becomes the navigation.** The same `<aside>` is `position: fixed`. As you scroll, the frame
   shrinks to the left column and the chapter list becomes a **sticky chapter index with Roman numerals
   I–XII**, where the active chapter is highlighted. The intro and the navigation are one element in two states.
4. **Chapter hero.** Each chapter `<section>` is very tall (Sidekick is 7,744 px). A `sticky top-0 h-screen`
   layer holds the art (a WebGL canvas) while a **huge grotesk title** (148 px, 700 weight, −3 % tracking:
   "Sidekick") sits at the bottom left and scrolls past.
5. **Editorial headline over art.** Next comes a large **italic serif** statement ("The AI-powered Shopify
   expert who's just as obsessed…") with an oversized **script initial capital** (ImperialScript). A video card
   sits beside it.
6. **The tear.** The dark art gives way to a cream sheet (`#F7F7EE`) whose top edge is a **torn-paper edge**.
   Torn paper is the transition between "gallery" mode and "reading" mode. Between chapters it reverses:
   paper tears away to reveal the next dark painting.
7. **Feature content on paper.** Cream background with a 12-column grid. Each feature is an `<article id=…>`
   (deep-linkable) containing:
   - a small bold label ("Smart suggestions")
   - a serif blurb
   - a "Read help doc ↗" chip
   - media: a video, a device mockup, or a fanned stack of tilted cards
   Some sub-sections are sticky (`sticky top-110`). One uses a horizontal-scroll card rail. Long lists drop into
   a dense two-column text grid (label + one line each).
8. **Paper texture.** Grey panels use a repeating paper texture image, so nothing is flat digital grey.
9. **Footer.** Tiny serif legal links, plus a "Get notified" modal for features that aren't live yet.

### Craft details worth stealing (the mechanics, not the assets)
- **One element, two states:** the intro frame *is* the nav. That reads as deliberate, not decorative.
- **Three type voices with strict jobs:** grotesk = names of things, serif italic = what it means to you,
  script = a single flourish per chapter. Never mixed inside one line.
- **Rhythm:** dark art (feel) → torn edge → cream paper (read) → torn edge → dark art. The reader always knows
  which mode they're in.
- **Deep links everywhere:** every feature is an `id`, and every chapter is a URL hash.
- **Performance hygiene:** `content-visibility: auto` with `contain-intrinsic-size` on long paper sections,
  lazy videos (no `src` until near the viewport), posters on all videos, and SVG icons via CSS `mask-image`.
- **Accessibility:** "Skip to main content", `sr-only` text behind the SVG lettering, `aria-hidden` on
  decorative lines, and a mobile layout that drops the sticky aside for a menu.

### What we don't copy
- Their paintings, lettering, fonts, copy or video. The fonts are commercial (Pangram Pangram, Hanken).
- WebGL for its own sake. We use it only where it earns its weight (see Part 2, §5).
- The scale: 46,000 px and 150 updates. Ours is about 10 chapters, and each one is a real product capability.

---

## Part 2: Our page, "Die Zahln Edition · Herbst '26"

### Concept
Shopify's renaissance theme says "a new age of commerce". Ours says **"the history of paying, finally
finished."** The art direction uses **public-domain Old Master paintings of money**: the money-changers and
merchants of Quentin Matsys and Marinus van Reymerswaele, and Dutch Golden Age market and tavern scenes, sourced
from **CC0 open-access collections** (Rijksmuseum, The Met Open Access, National Gallery of Art). We treat them
with our ember-and-ink palette and cut them with the **torn-receipt edge** already used in the app. 500 years
of counting coins, then one QR.

> The licence of every image is checked and recorded in `apps/landing/ASSETS.md` (source URL, collection,
> licence) before it ships. No image without a CC0 / public-domain record.

### Chapters (Roman numerals, sticky index)
| # | Chapter | One-line promise (serif) | Proof on the paper section |
|---|---|---|---|
| I | **Bezahlen** (Pay) | Scan, look, done. | Consumer app video: scan → Face ID → Bezahlt; time-to-confirmation number |
| II | **Kasse** (Till) | Your counter, minus the card reader. | Merchant app: catalogue → 5-minute QR → payment received |
| III | **Wallet** | The money is yours the moment it lands. | Live balance, history, receipts |
| IV | **Auszahlung** (Payout) | SEPA Instant, every night at 23:00. | Settlement timeline, withdraw any time |
| V | **Funkloch** (Dead zone) | The connection drops. The payment doesn't. | The "Checking with your bank" state; idempotency explained in one sentence |
| VI | **Pläne** (Plans) | 0 % fees. Forever. | Free / Pro / Business cards, fanned |
| VII | **Ordnung** (Records) | Your tax adviser will like you. | GoBD receipts, DATEV export, TSE |
| VIII | **Campus** | Built for the Mensa queue. | Studierendenwerk story, throughput number |
| IX | **Sicherheit** (Security) | Your keys never leave your phone. | Keychain, device binding, data in Germany |
| X | **Für Entwickler** (Developers) | One API. Double-entry underneath. | Code snippet, ledger diagram, payment states |

German first, with an EN toggle in the top bar (the same i18n keys as the apps).

### Layout and motion spec
1. **Top bar:** Zahln receipt mark + "Edition Herbst '26" · Kapitel ▾ · DE/EN · CTA "Kostenlos starten"
   (ember pill, ink text). The bar turns solid when it lands on a paper section (`data-nav-style`, the same trick
   Shopify uses).
2. **Intro:** a full-bleed Matsys money-changer painting with an ink overlay. A portrait frame draws itself
   (SVG `pathLength=1`, dashoffset 1→0, 900 ms), with construction lines extending to the viewport edges. Inside
   the frame:
   - the title "Die Zahln Edition", set in a bold grotesk, with an ember swash on the "Z" (our own SVG lettering
     plus `sr-only` text)
   - the serif line "Bezahlen, endlich fertig. 10 Kapitel."
   - chapters I–X
3. **Frame → index:** on scroll, the frame interpolates (one shared element, driven by a scroll-linked
   `useScroll` progress) into a fixed left-column chapter index with Roman numerals. The active chapter is
   tracked with an `IntersectionObserver` and highlighted in ember.
4. **Chapter hero:** a sticky full-viewport painting with slow parallax (scale 1.08→1.0) and grain, plus a giant
   grotesk title (clamp 64–160 px, −3 % tracking) at the bottom left.
5. **Hero art layer (the one WebGL moment):** an **OGL** or raw WebGL2 fragment shader that adds film grain and an
   ember "light leak" sweep. It falls back to a static image with a CSS grain overlay when
   `prefers-reduced-motion` is set, WebGL is unavailable, or the device is low-end
   (`navigator.hardwareConcurrency <= 4`).
6. **The tear:** cream paper (`#F7F3EE`, our paper token) slides over the art with a **torn-receipt top edge**: an
   SVG path generated once from a seeded noise function, so it is deterministic and identical on server and client.
   On mobile the tear is shallower.
7. **Editorial line:** a large italic serif statement with one script initial per chapter, then an autoplaying,
   muted, looping **device video** (real screen recordings of our apps in an iPhone/Pixel frame) with a poster.
8. **Feature articles:** a 12-column grid. Each article has a small bold label, a serif blurb and a "Mehr dazu ↗"
   chip linking to the customer web app or docs. Media is a device video, a fanned card stack, or a live component
   (e.g. a real `<PaymentStatus>` cycling through states, built from the shared state machine).
9. **Closing:** a dark art section ending in a large CTA ("Kostenlos starten"), App Store / Play badges
   (placeholders) and a small serif footer.

### Typography (free, licence-safe stand-ins for their three voices)
| Voice | Shopify | Ours | Use |
|---|---|---|---|
| Display grotesk | NeueMontreal Bold | **Inter Tight** 700/800 (OFL) | Chapter titles, nav, labels |
| Editorial serif | HWCigars | **Instrument Serif** Regular + Italic (OFL) | Statements, blurbs, subtitles |
| Script initial | ImperialScript | **Pinyon Script** (OFL), one glyph per chapter | Drop caps only |
| UI | Inter Variable | **Inter** (already in the apps) | Buttons, small UI |

### Tech
- **Next.js 16 (App Router), static export where possible:** SSR/SSG for SEO and first paint, the same React as
  the web app, and `next/font` for self-hosted fonts with zero layout shift.
- **Lenis 1.3** for smooth scroll, wired to **Motion 14** (`useScroll`, `useTransform`, `useInView`) so all
  scroll-linked motion reads one source.
- **Tailwind 4**, with tokens imported from `@zahln/shared/tokens` as CSS variables.
- **OGL** (about 30 KB) for the single shader, rather than Three.js (about 600 KB). We need one full-screen quad,
  not a scene graph.
- Video: H.264 MP4 + WebM, 1080p at around 2.5 Mbps (the same budget Shopify uses), with posters, lazy-attached
  `src`.

### Budgets (checked by CI with Lighthouse CI on the built site)
| Metric | Budget |
|---|---|
| LCP (mobile, 4G) | < 2.0 s |
| CLS | < 0.02 |
| INP | < 150 ms |
| JS on first load | < 150 KB gzipped |
| Lighthouse Accessibility | 100 |
| Reduced motion | Every effect has a static equivalent; the page reads fully without JS |

### Accessibility
- Skip link, landmarks, one `h1` and an `h2` per chapter, and a chapter index that works as `<nav>` with
  `aria-current`.
- All SVG lettering has `sr-only` text, and decorative lines and art are `aria-hidden`.
- Videos are muted, with a visible pause control (WCAG 2.2.2) and captions on anything with speech.
- Contrast: ember on ink and ink on paper are already verified by `contrastRatio` tests in `@zahln/shared`.

### Interview angle
"Their own page is a promise of craft. I reverse-engineered how Shopify's Editions page is built (Remix SSR,
Lenis, one WebGL layer, sticky chapters, torn-paper transitions, `content-visibility`), then rebuilt the
*mechanics* with our own brand, licence-clean art, and a performance budget enforced in CI."
