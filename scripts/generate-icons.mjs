// Generates every app icon, launch logo and splash asset for both apps from one SVG mark.
// Usage: node scripts/generate-icons.mjs   (writes into apps/consumer and apps/merchant)
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const EMBER = '#FF4F1F';
const INK = '#1B1A17';
const INK_DARK = '#141312';
const PAPER = '#F7F3EE';
const PAPER_DIM = '#E9E3DA';

// The mark: a receipt with a torn bottom edge carrying a bold Z. viewBox 0 0 100 100.
const teeth = (x0, x1, y, amp, n) => {
  let d = '';
  const s = (x1 - x0) / n;
  for (let i = 1; i <= n; i++)
    d += ` L${(x1 - s * (i - 0.5)).toFixed(2)} ${y + amp} L${(x1 - s * i).toFixed(2)} ${y}`;
  return d;
};
const RECEIPT = `M24 26 Q24 18 32 18 H68 Q76 18 76 26 V76${teeth(24, 76, 76, 6, 5)} Z`;
const Z = 'M38 33 H62 L38 57 H62';
const glyph = (paper, ink, scale = 1) =>
  `<g transform="translate(${50 - 50 * scale} ${50 - 50 * scale}) scale(${scale})"><path d="${RECEIPT}" fill="${paper}"/><path d="${Z}" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></g>`;
const svg = (inner, bg = null, rx = 0) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${bg ? `<rect width="100" height="100" rx="${rx}" fill="${bg}"/>` : ''}${inner}</svg>`;
const png = (file, svgText, size) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, new Resvg(svgText, { fitTo: { mode: 'width', value: size } }).render().asPng());
};
const json = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);

/**
 * Zaster (consumer) is ember-first: a paper receipt on an ember tile; dark appearance flips to an ember receipt on ink.
 * Zettel (merchant) is ink-first: a paper receipt with an ember Z on an ink tile, like a till slip under counter light.
 */
const BRANDS = {
  consumer: {
    project: 'Zaster',
    tile: EMBER,
    light: glyph(PAPER, INK, 1.12),
    dark: { bg: INK_DARK, glyph: glyph(EMBER, INK_DARK, 1.12) },
    // On the ink launch screen the ember tile carries the mark.
    launch: svg(glyph(PAPER, INK, 1), EMBER, 28),
    android: (s) => glyph(PAPER, INK, s),
  },
  merchant: {
    project: 'Zettel',
    tile: INK,
    light: glyph(PAPER, EMBER, 1.12),
    dark: { bg: INK_DARK, glyph: glyph(PAPER_DIM, EMBER, 1.12) },
    // An ink tile would vanish on the ink launch screen, so the bare mark is used, slightly larger.
    launch: svg(glyph(PAPER, EMBER, 1.25)),
    android: (s) => glyph(PAPER, EMBER, s),
  },
};

for (const [app, b] of Object.entries(BRANDS)) {
  const base = `${ROOT}/apps/${app}`;

  // iOS: one 1024 icon per appearance (iOS 18+).
  const ios = `${base}/ios/${b.project}/Images.xcassets`;
  png(`${ios}/AppIcon.appiconset/icon-1024.png`, svg(b.light, b.tile), 1024);
  png(`${ios}/AppIcon.appiconset/icon-1024-dark.png`, svg(b.dark.glyph, b.dark.bg), 1024);
  png(
    `${ios}/AppIcon.appiconset/icon-1024-tinted.png`,
    svg(glyph('#FFFFFF', '#000000', 1.12), '#000000'),
    1024,
  );
  json(`${ios}/AppIcon.appiconset/Contents.json`, {
    images: [
      { filename: 'icon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
      {
        appearances: [{ appearance: 'luminosity', value: 'dark' }],
        filename: 'icon-1024-dark.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024',
      },
      {
        appearances: [{ appearance: 'luminosity', value: 'tinted' }],
        filename: 'icon-1024-tinted.png',
        idiom: 'universal',
        platform: 'ios',
        size: '1024x1024',
      },
    ],
    info: { author: 'xcode', version: 1 },
  });
  for (const [scale, name] of [
    [1, 'launch-logo.png'],
    [2, 'launch-logo@2x.png'],
    [3, 'launch-logo@3x.png'],
  ])
    png(`${ios}/LaunchLogo.imageset/${name}`, b.launch, 120 * scale);

  // Android: legacy, round, adaptive (foreground + monochrome) and the Android 12+ splash icon.
  const res = `${base}/android/app/src/main/res`;
  for (const [d, k] of Object.entries({ mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 })) {
    png(`${res}/mipmap-${d}/ic_launcher.png`, svg(b.android(1.05), b.tile, 22), 48 * k);
    png(
      `${res}/mipmap-${d}/ic_launcher_round.png`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="${b.tile}"/>${b.android(0.95)}</svg>`,
      48 * k,
    );
    // Adaptive layers are 108 dp; the glyph stays inside the 66 dp safe zone.
    png(`${res}/mipmap-${d}/ic_launcher_foreground.png`, svg(b.android(0.72)), 108 * k);
    png(
      `${res}/mipmap-${d}/ic_launcher_monochrome.png`,
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><mask id="m"><rect width="100" height="100" fill="black"/>${glyph('#FFFFFF', '#000000', 0.72)}</mask><rect width="100" height="100" fill="#FFFFFF" mask="url(#m)"/></svg>`,
      108 * k,
    );
  }
  // Android 12+ splash: a 240 dp canvas; the icon must sit inside the central 160 dp circle.
  png(
    `${res}/drawable-nodpi/splash_icon.png`,
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><g transform="translate(70 70)">${b.launch.replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`,
    960,
  );
  writeFileSync(
    `${res}/values/colors.xml`,
    `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Ember and ink (docs/HANDBOOK.md §3.17). Generated by scripts/generate-icons.mjs. -->
    <color name="ic_launcher_background">${b.tile}</color>
    <color name="splash_background">${INK}</color>
</resources>
`,
  );
}

// Preview sheet for the docs: Zaster light/dark, Zettel light/dark.
const tileSvg = (inner, bg) =>
  `<svg width="80" height="80" viewBox="0 0 100 100"><rect width="100" height="100" rx="22" fill="${bg}"/>${inner}</svg>`;
png(
  `${ROOT}/docs/screenshots/app-icons.png`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 100"><rect width="460" height="100" fill="${PAPER}"/>
<g transform="translate(10 10)">${tileSvg(BRANDS.consumer.light, EMBER)}</g>
<g transform="translate(110 10)">${tileSvg(BRANDS.consumer.dark.glyph, INK_DARK)}</g>
<g transform="translate(270 10)">${tileSvg(BRANDS.merchant.light, INK)}</g>
<g transform="translate(370 10)">${tileSvg(BRANDS.merchant.dark.glyph, INK_DARK)}</g></svg>`,
  1380,
);
process.stdout.write('icons, launch logos and splash assets written for Zaster and Zettel\n');
