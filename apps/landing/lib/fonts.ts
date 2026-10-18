import { Instrument_Serif, Inter, Inter_Tight, Pinyon_Script } from 'next/font/google';

// next/font downloads these at build time and serves them from our own origin (no Google request at runtime),
// with size-adjusted fallbacks so a swap causes no layout shift. All four are SIL OFL 1.1.
// display: 'optional' for the text faces: if a face isn't there within ~100 ms on a first visit over a slow
// network, the metric-matched fallback stays for that page view instead of re-rendering the hero text late
// (which is what pushed LCP to 4.4 s on the Lighthouse mobile profile). Cached visits always get the real faces.

/** UI: buttons, small labels. */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'optional',
  preload: false,
});

/** Display grotesk: names of things (chapter titles, nav, labels). */
export const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-inter-tight',
  display: 'optional',
});

/** Editorial serif: what it means to you. */
export const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-instrument-serif',
  display: 'optional',
});

/** Script: exactly one initial per chapter. Never preloaded; it is decoration. */
export const pinyonScript = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pinyon-script',
  display: 'swap',
  preload: false,
});

export const fontVariables = [inter, interTight, instrumentSerif, pinyonScript]
  .map((f) => f.variable)
  .join(' ');
