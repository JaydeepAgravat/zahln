import { colors, contrastRatio, motion } from '@zaster/shared/tokens';
import type { CSSProperties } from 'react';

const c = colors.light;

/**
 * The landing palette, taken from the shared "Ember and ink" tokens (never raw hex in components).
 * Rendered as CSS variables on <html>; app/globals.css maps them into the Tailwind 4 theme with `@theme inline`.
 */
export const palette = {
  paper: c.bg,
  'paper-raised': c.surfaceRaised,
  'paper-muted': c.surfaceMuted,
  ink: c.ink,
  'on-ink': c.onInk,
  'on-ink-muted': c.onInkMuted,
  ember: c.brand,
  'on-ember': c.onBrand,
  'ember-text': c.brandText,
  'ember-subtle': c.brandSubtle,
  line: c.border,
  'line-strong': c.borderStrong,
  'text-2': c.textSecondary,
  'text-3': c.textTertiary,
  success: c.success,
  'flood-paid': c.floodPaid,
  'flood-not-charged': c.floodNotCharged,
  'on-flood': c.onFlood,
  pending: c.pending,
  'pending-subtle': c.pendingSubtle,
  saffron: c.accent,
} as const;

export const tokenStyle = {
  ...Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--z-${k}`, v])),
  '--z-ease': `cubic-bezier(${motion.easing.standard.join(',')})`,
  '--z-ease-enter': `cubic-bezier(${motion.easing.enter.join(',')})`,
  '--z-slow': `${motion.duration.slow}ms`,
} as CSSProperties;

/** The pairs the page relies on, re-checked here so a token change that breaks AA fails the landing tests too. */
export const textPairs: Array<[string, string, string, number]> = [
  ['ink on paper', c.ink, c.bg, 4.5],
  ['paper on ink', c.onInk, c.ink, 4.5],
  ['muted on ink', c.onInkMuted, c.ink, 4.5],
  ['ink on ember', c.onBrand, c.brand, 4.5],
  ['secondary on paper', c.textSecondary, c.bg, 4.5],
  ['tertiary on paper', c.textTertiary, c.bg, 4.5],
  ['ember text on paper', c.brandText, c.bg, 4.5],
  ['white on paid flood', c.onFlood, c.floodPaid, 4.5],
  ['white on not-charged flood', c.onFlood, c.floodNotCharged, 4.5],
  ['ember on ink (large initials)', c.brand, c.ink, 3],
];
export { contrastRatio };
