import { describe, expect, it } from 'vitest';
import de from '../src/i18n/de.json';
import en from '../src/i18n/en.json';
import { hasFeature, minimumPlanFor, PLAN_FEATURES } from '../src/plans';
import { type ColorScheme, colors, contrastRatio } from '../src/tokens';

describe('plans', () => {
  it('matches the published plans', () => {
    expect(hasFeature('free', 'static_qr')).toBe(true);
    expect(hasFeature('free', 'dynamic_qr')).toBe(false);
    expect(hasFeature('pro', 'dynamic_qr')).toBe(true);
    expect(hasFeature('pro', 'refunds')).toBe(true);
    expect(hasFeature('pro', 'catalogue')).toBe(false);
    expect(hasFeature('business', 'catalogue')).toBe(true);
  });

  it('each plan includes everything from the plan below', () => {
    for (const f of PLAN_FEATURES.free) expect(PLAN_FEATURES.pro).toContain(f);
    for (const f of PLAN_FEATURES.pro) expect(PLAN_FEATURES.business).toContain(f);
  });

  it('knows the cheapest plan for upgrade prompts', () => {
    expect(minimumPlanFor('dynamic_qr')).toBe('pro');
    expect(minimumPlanFor('csv_export')).toBe('business');
  });
});

describe('design tokens meet WCAG AA', () => {
  const schemes: ColorScheme[] = ['light', 'dark'];
  const textPairs = [
    ['textPrimary', 'bg'],
    ['textPrimary', 'surfaceRaised'],
    ['textSecondary', 'surfaceRaised'],
    ['textTertiary', 'bg'],
    ['textTertiary', 'surfaceRaised'],
    ['onBrand', 'brand'],
    ['accentText', 'surface'],
    ['brandText', 'bg'],
    ['brandText', 'brandSubtle'],
    ['onInk', 'ink'],
    ['onInkMuted', 'ink'],
    ['textPrimary', 'surfaceMuted'],
    ['accentText', 'accentSubtle'],
    ['success', 'successSubtle'],
    ['warning', 'warningSubtle'],
    ['danger', 'dangerSubtle'],
    ['info', 'infoSubtle'],
    ['pending', 'pendingSubtle'],
    ['onFlood', 'floodPaid'],
    ['onFlood', 'floodNotCharged'],
  ] as const;

  for (const scheme of schemes) {
    for (const [fg, bg] of textPairs) {
      it(`${scheme}: ${fg} on ${bg} ≥ 4.5`, () => {
        expect(contrastRatio(colors[scheme][fg], colors[scheme][bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    it(`${scheme}: borderStrong on surface ≥ 3 (non-text UI)`, () => {
      expect(contrastRatio(colors[scheme].borderStrong, colors[scheme].surface)).toBeGreaterThanOrEqual(3);
    });
  }

  it('light and dark define the same tokens', () => {
    expect(Object.keys(colors.dark).sort()).toEqual(Object.keys(colors.light).sort());
  });
});

describe('i18n', () => {
  const keys = (o: object, prefix = ''): string[] =>
    Object.entries(o).flatMap(([k, v]) =>
      typeof v === 'object' && v ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );

  it('German and English have the same keys', () => {
    expect(keys(en).sort()).toEqual(keys(de).sort());
  });
});
