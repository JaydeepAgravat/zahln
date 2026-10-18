// Tailwind 3 (NativeWind 4). The theme is generated from @zahln/shared tokens: never hand-edit colours here.
// Tailwind loads this file with jiti, which can require the TypeScript token module directly.
const { tailwindTheme } = require('../../packages/shared/src/tokens/tailwind.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.js', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    colors: tailwindTheme.colors,
    spacing: tailwindTheme.spacing,
    borderRadius: tailwindTheme.borderRadius,
    fontFamily: tailwindTheme.fontFamily,
    fontSize: tailwindTheme.fontSize,
    extend: {},
  },
  plugins: [],
};
