import { type ColorScheme, type ColorToken, colors, fontFamily, radius, spacing, typeScale } from './index';

/** `textPrimary` → `text-primary` */
const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const colorVar = (token: ColorToken) => `--color-${kebab(token)}`;

/** CSS variables for one theme, e.g. `{ '--color-bg': '#F6F5F2', … }`. Applied at the app root. */
export function cssVariables(scheme: ColorScheme): Record<string, string> {
  return Object.fromEntries(
    (Object.keys(colors[scheme]) as ColorToken[]).map((token) => [colorVar(token), colors[scheme][token]]),
  );
}

const px = (n: number) => `${n}px`;

/**
 * Tailwind theme generated from the tokens. Colours point at CSS variables, so one class
 * (`bg-surface`) is correct in light and dark. Screens never use raw hex values.
 */
export const tailwindTheme = {
  colors: {
    transparent: 'transparent',
    ...Object.fromEntries(
      (Object.keys(colors.light) as ColorToken[]).map((token) => [kebab(token), `var(${colorVar(token)})`]),
    ),
  },
  spacing: Object.fromEntries(Object.entries(spacing).map(([k, v]) => [k, px(v)])),
  borderRadius: Object.fromEntries(Object.entries(radius).map(([k, v]) => [k, px(v)])),
  fontFamily: {
    inter: [fontFamily.regular],
    'inter-medium': [fontFamily.medium],
    'inter-semibold': [fontFamily.semibold],
  },
  fontSize: Object.fromEntries(
    Object.entries(typeScale).map(([k, v]) => [kebab(k), [px(v.size), { lineHeight: px(v.lineHeight) }]]),
  ),
} as const;
