/**
 * "Ember and ink" design tokens (Quittung system, v2 palette) (docs/DESIGN_SYSTEM.md). The single source of truth:
 * generated into a Tailwind 3 preset for NativeWind (Day 2) and CSS variables for the web console (Day 5).
 * Contrast ratios are documented in DESIGN_SYSTEM.md and checked in test/tokens.test.ts.
 */
export const colors = {
  light: {
    // Warm paper canvas, near-black ink, one ember accent.
    bg: '#F7F3EE',
    surface: '#FFFDFA',
    surfaceRaised: '#FFFFFF',
    surfaceMuted: '#EFE7DD',
    border: '#E6DED3',
    borderStrong: '#8F877C',
    textPrimary: '#1B1A17',
    textSecondary: '#5E574E',
    textTertiary: '#736B60',
    // Ember is the brand. Text on ember is ink, not white: white on #FF4F1F is only 3.3:1.
    brand: '#FF4F1F',
    onBrand: '#1B1A17',
    brandText: '#B8340A',
    brandSubtle: '#FFE2D6',
    // The ink card (balance, receipts) stays dark in both themes.
    ink: '#1B1A17',
    onInk: '#F7F3EE',
    onInkMuted: '#B3ACA2',
    accent: '#F5A524',
    accentText: '#8A5300',
    accentSubtle: '#FCEFD6',
    // Green means money moved, nothing else.
    success: '#16784A',
    successSubtle: '#DDF3E6',
    warning: '#8F5100',
    warningSubtle: '#FBEBD3',
    // Danger is raspberry, deliberately far from ember so the brand never reads as an error.
    danger: '#C2183B',
    dangerSubtle: '#FCE4E8',
    info: '#2357C9',
    infoSubtle: '#E3EBFB',
    pending: '#6B6458',
    pendingSubtle: '#EFE9E0',
    floodPaid: '#137A45',
    floodNotCharged: '#B3203F',
    onFlood: '#FFFFFF',
    qrBackground: '#FFFFFF',
    qrForeground: '#1B1A17',
  },
  dark: {
    bg: '#121110',
    surface: '#1B1A18',
    surfaceRaised: '#252320',
    surfaceMuted: '#2C2925',
    border: '#34312C',
    borderStrong: '#7A736C',
    textPrimary: '#F5F0E9',
    textSecondary: '#BEB6AB',
    textTertiary: '#9A9286',
    brand: '#FF6A3D',
    onBrand: '#1B1A17',
    brandText: '#FF8A63',
    brandSubtle: '#3A2118',
    ink: '#252320',
    onInk: '#F5F0E9',
    onInkMuted: '#BEB6AB',
    accent: '#F5B547',
    accentText: '#F5B547',
    accentSubtle: '#352810',
    success: '#3DD68C',
    successSubtle: '#12301F',
    warning: '#F2B54A',
    warningSubtle: '#352810',
    danger: '#FF6B81',
    dangerSubtle: '#3D1A20',
    info: '#7AA7FF',
    infoSubtle: '#15233D',
    pending: '#B4AC9F',
    pendingSubtle: '#2A2723',
    floodPaid: '#137A45',
    floodNotCharged: '#A3203A',
    onFlood: '#FFFFFF',
    qrBackground: '#FFFFFF',
    qrForeground: '#1B1A17',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ColorToken = keyof (typeof colors)['light'];

/** 4-pt scale (+ 2 / 6 for hairline gaps). Keys are Tailwind class suffixes: `p-4` = 16 px. */
export const spacing = {
  px: 1,
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
} as const;
export const layout = { gutter: 20, minTouch: 48, keypadKey: 64, payButton: 56 } as const;
export const radius = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, full: 999 } as const;

/**
 * Font files are named after their PostScript names, so the same string works on iOS and Android.
 * Weight is chosen by family (Android can't synthesise weights for custom fonts).
 * Inter Display isn't served as a static file by Google Fonts, so amounts use Inter SemiBold + tight tracking.
 */
export const fontFamily = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;
export type FontWeightName = keyof typeof fontFamily;

export const typeScale = {
  hero: { size: 36, lineHeight: 40, weight: 'bold', tabular: false, tracking: -0.03 },
  amountHero: { size: 48, lineHeight: 54, weight: 'bold', tabular: true, tracking: -0.03 },
  amountLg: { size: 40, lineHeight: 44, weight: 'semibold', tabular: true, tracking: -0.01 },
  display: { size: 30, lineHeight: 36, weight: 'bold', tabular: false, tracking: -0.02 },
  title: { size: 24, lineHeight: 30, weight: 'bold', tabular: false, tracking: -0.015 },
  headline: { size: 20, lineHeight: 26, weight: 'semibold', tabular: false, tracking: 0 },
  body: { size: 17, lineHeight: 24, weight: 'regular', tabular: false, tracking: 0 },
  callout: { size: 15, lineHeight: 20, weight: 'regular', tabular: false, tracking: 0 },
  footnote: { size: 13, lineHeight: 18, weight: 'regular', tabular: false, tracking: 0 },
  caption: { size: 12, lineHeight: 16, weight: 'medium', tabular: false, tracking: 0.02 },
  keypadDigit: { size: 28, lineHeight: 32, weight: 'medium', tabular: true, tracking: 0 },
} as const;
export type TypeStyle = keyof typeof typeScale;
export type TypeSpec = {
  size: number;
  lineHeight: number;
  weight: FontWeightName;
  tabular: boolean;
  tracking: number;
};

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
