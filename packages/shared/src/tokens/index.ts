/**
 * "Quittung" design tokens (docs/DESIGN_SYSTEM.md). The single source of truth:
 * generated into a Tailwind 3 preset for NativeWind (Day 2) and CSS variables for the web console (Day 5).
 * Contrast ratios are documented in DESIGN_SYSTEM.md and checked in test/tokens.test.ts.
 */
export const colors = {
  light: {
    bg: '#F6F5F2',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#DEDBD4',
    borderStrong: '#8A8C93',
    textPrimary: '#15161A',
    textSecondary: '#4F5159',
    textTertiary: '#6B6D76',
    brand: '#3A35B8',
    onBrand: '#FFFFFF',
    brandSubtle: '#ECEBFB',
    accent: '#D9542B',
    accentText: '#A63D19',
    accentSubtle: '#FDECE4',
    success: '#12784A',
    successSubtle: '#E3F3EA',
    warning: '#9A5800',
    warningSubtle: '#FCF0D9',
    danger: '#C0262F',
    dangerSubtle: '#FCE8E8',
    info: '#1F68AD',
    infoSubtle: '#E5EFFA',
    pending: '#56607A',
    pendingSubtle: '#ECEEF3',
    floodPaid: '#12784A',
    floodNotCharged: '#C0262F',
    onFlood: '#FFFFFF',
    qrBackground: '#FFFFFF',
    qrForeground: '#000000',
  },
  dark: {
    bg: '#111214',
    surface: '#1A1B1F',
    surfaceRaised: '#24252A',
    border: '#3A3C43',
    borderStrong: '#6F727B',
    textPrimary: '#F2F1EE',
    textSecondary: '#B6B7BE',
    textTertiary: '#8E9099',
    brand: '#A9A5FF',
    onBrand: '#17134D',
    brandSubtle: '#25234D',
    accent: '#FF9670',
    accentText: '#FF9670',
    accentSubtle: '#3B2319',
    success: '#52CF8F',
    successSubtle: '#11301F',
    warning: '#F2B54A',
    warningSubtle: '#352810',
    danger: '#FF7F7F',
    dangerSubtle: '#3D1B1D',
    info: '#72B5F0',
    infoSubtle: '#132A3E',
    pending: '#A9B2C6',
    pendingSubtle: '#23262E',
    floodPaid: '#146B45',
    floodNotCharged: '#A3202A',
    onFlood: '#FFFFFF',
    qrBackground: '#FFFFFF',
    qrForeground: '#000000',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

export const spacing = {
  0: 0,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;
export const layout = { gutter: 20, minTouch: 48, keypadKey: 64, payButton: 56 } as const;
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

export const fontFamily = {
  ui: 'Inter',
  display: 'InterDisplay',
} as const;

export const typeScale = {
  amountHero: { size: 56, lineHeight: 60, weight: '600', tabular: true, tracking: -0.02, family: 'display' },
  amountLg: { size: 40, lineHeight: 44, weight: '600', tabular: true, tracking: 0, family: 'display' },
  display: { size: 32, lineHeight: 38, weight: '600', tabular: false, tracking: 0, family: 'display' },
  title: { size: 24, lineHeight: 30, weight: '600', tabular: false, tracking: 0, family: 'ui' },
  headline: { size: 20, lineHeight: 26, weight: '600', tabular: false, tracking: 0, family: 'ui' },
  body: { size: 17, lineHeight: 24, weight: '400', tabular: false, tracking: 0, family: 'ui' },
  callout: { size: 15, lineHeight: 20, weight: '400', tabular: false, tracking: 0, family: 'ui' },
  footnote: { size: 13, lineHeight: 18, weight: '400', tabular: false, tracking: 0, family: 'ui' },
  caption: { size: 12, lineHeight: 16, weight: '500', tabular: false, tracking: 0.02, family: 'ui' },
  keypadDigit: { size: 28, lineHeight: 32, weight: '500', tabular: true, tracking: 0, family: 'ui' },
} as const;
export type TypeStyle = keyof typeof typeScale;

/** Max Dynamic Type multiplier for amounts; beyond this they wrap instead of growing. */
export const AMOUNT_MAX_FONT_SCALE = 1.5;

export const motion = {
  duration: { instant: 80, fast: 150, base: 240, slow: 400, celebrate: 600 },
  easing: {
    standard: [0.2, 0, 0, 1],
    enter: [0, 0, 0, 1],
    exit: [0.3, 0, 1, 1],
  },
  spring: { dampingRatio: 0.7, stiffness: 260 },
  reduceMotionCrossfade: 120,
  paidAutoDismissMs: 2500,
} as const;

export const elevation = {
  light: {
    e1: '0 1px 2px rgba(21,22,26,.06), 0 1px 1px rgba(21,22,26,.04)',
    e2: '0 8px 24px rgba(21,22,26,.10)',
  },
  dark: { hairline: 'rgba(255,255,255,.06)' },
} as const;

/** WCAG 2.x contrast ratio between two #RRGGBB colours. */
export function contrastRatio(a: string, b: string): number {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const v = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
