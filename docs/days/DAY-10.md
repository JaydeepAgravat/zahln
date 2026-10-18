# Day 10: The Zahln Edition II: motion, shader and budgets

## Goal
"The page moves like the Editions page: the intro frame draws itself and becomes the chapter index, art heroes
hold while titles scroll past, paper tears in and out, and a single shader adds grain and an ember light leak.
It stays inside a budget that CI enforces, and every effect has a reduced-motion equivalent."

## Why it matters for the interview
- Anyone can add animations. Doing it inside a measured budget, accessibly, is the craft signal.
- It's the clearest place to show "you measure performance instead of asserting it" (from the JD).
- See [LANDING.md](../LANDING.md) Part 2 for the motion spec.

---

## Concepts to understand first

### 1. One scroll source
Lenis owns scrolling (`autoRaf: false`) and drives a single `requestAnimationFrame` loop. Motion's
`useScroll` reads `window` scroll, which Lenis updates, so every effect agrees on the same number each frame. Turn
Lenis **off** when `prefers-reduced-motion: reduce` is set or on touch devices with native momentum (native
scrolling there is better than any emulation).

### 2. The frame → index morph
One element, two states. Measure both rects (`intro frame` and `index column`) on resize. Scroll progress
0 → 0.15 of the intro section maps to `x`, `y`, `scale` and the opacity of the frame strokes, using transforms only
(no layout properties), so it's compositor-only. The chapter list items are the same DOM nodes in both states.

### 3. Sticky heroes, cheap parallax
A chapter hero is `position: sticky; top: 0; height: 100svh`. The image scales 1.08 → 1.0 over the hero's scroll
range (`useTransform`). The title scrolls normally. Nothing is pinned with JS, because CSS sticky is free.

### 4. The tear transition
The paper section has the torn mask on its top edge and a negative top margin, so it slides over the sticky art.
A small `translateY` lag on the edge alone (2–4 %) makes it feel like paper rather than a div.

### 5. The shader (OGL)
- One full-screen triangle, with a fragment shader for film grain (hash noise × time) plus an ember radial leak
  that sweeps on chapter enter.
- It renders only while the hero is in view (`IntersectionObserver` → start/stop RAF), at DPR ≤ 1.5, and is paused
  on `visibilitychange`.
- Fallback: a static grain PNG overlay. It is chosen at runtime if `prefers-reduced-motion` is set, WebGL2 is
  missing, `hardwareConcurrency <= 4`, or `saveData` is on.

### 6. Budgets as tests
`lighthouserc.json` asserts LCP < 2000 ms, CLS < 0.02, TBT < 200 ms, a11y = 100, and total JS < 150 KB gzipped
(`resource-summary`). Run it on the static export in CI. A regression fails the build.

---

## Tasks

### A. Motion (≈4 h)
- [ ] `SmoothScroll` provider (Lenis + Motion frame sync; disabled for reduced motion)
- [ ] Intro: frame stroke draws (dashoffset), construction lines extend, lettering fades in word by word
- [ ] Frame → index morph; active chapter tracking (IntersectionObserver) with an ember indicator and `aria-current`
- [ ] Hero parallax + title; tear lag; articles fade/translate in once (`useInView`, `once: true`)
- [ ] Plan cards fan out on enter; the device videos play only in view (and pause off-screen)
- [ ] The live `<PaymentStatus>` widget cycles through the shared state machine's states (it really imports the reducer)
- [ ] Nav goes solid over paper sections (`data-nav-style`)

### B. Shader (≈1.5 h)
- [ ] `ArtShader` with OGL: grain + ember leak; start/stop by visibility; DPR cap; fallback logic
- [ ] Bundle-check: the shader chunk is lazy-loaded after LCP

### C. Accessibility + controls (≈1 h)
- [ ] Pause control for all motion/video (WCAG 2.2.2), remembered in `localStorage` (wrapped in try/catch)
- [ ] Keyboard: skip link, index links move focus to the chapter `h2`; visible focus rings on dark and paper
- [ ] Screen reader pass (VoiceOver): the reading order matches the visual order

### D. Budgets + CI (≈1.5 h)
- [ ] `lighthouserc.json`; GitHub Actions job: build the landing page → Lighthouse CI (mobile preset) → assert
- [ ] Test on a throttled profile (Moto G Power, 4G) and record the numbers in LANDING.md
- [ ] OG image (`/opengraph-image`): the title lettering on ink with the receipt edge

---

## Files you'll create
```
apps/landing/components/{SmoothScroll, FrameMorph, ArtShader, PaymentStatusDemo, MotionPause}.tsx
apps/landing/shaders/{grain.frag, fullscreen.vert}
apps/landing/lighthouserc.json  .github/workflows/landing.yml
```

## Commands
```bash
pnpm --filter @zahln/landing build
pnpm --filter @zahln/landing exec lhci autorun
```

## Pitfalls
- **Animating `top`/`left`/`width`** causes layout thrash. Use transforms and opacity only.
- **Lenis + `position: sticky`** is fine; Lenis + `overflow: hidden` on `body` breaks it. Don't set overflow on html/body.
- **Videos stealing LCP:** the hero's LCP element must be the art image (with `fetchpriority="high"`), never a video.
- **The shader on battery:** stop RAF when off-screen and when the tab is hidden, or a laptop fan will spin up.
- **Reduced motion means fewer effects, not none:** keep opacity fades (they're fine) and drop parallax, morphs and the shader.

## Done when
- [ ] Desktop Chrome, Safari and Firefox plus mobile Safari/Chrome: smooth, no jank in the Performance panel (no long tasks > 50 ms while scrolling)
- [ ] Lighthouse CI passes all budgets on the mobile preset
- [ ] Reduced motion: a complete, calm page, with no parallax or shader
- [ ] A 30-second screen recording of the scroll is saved for the README and the video

## Interview drill
1. "Why OGL and not Three.js? Why a shader at all?"
2. "How do you keep scroll-linked animation off the main thread?"
3. "What does your page do for someone with vestibular disorders?"
4. "Show me the budget that fails the build."

## Commit
```
feat(landing): smooth scroll, frame-to-index morph, sticky heroes and tear transitions
feat(landing): OGL grain and ember light-leak shader with fallbacks
ci(landing): Lighthouse CI budgets
```
