import { usePrefs } from '@zahln/mobile-core';
import { type ColorScheme, colors } from '@zahln/shared/tokens';
import { cssVariables } from '@zahln/shared/tokens/tailwind';
import { vars } from 'nativewind';
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { StatusBar, useColorScheme, View } from 'react-native';

export type ThemePreference = 'system' | ColorScheme;

const themeVars = { light: vars(cssVariables('light')), dark: vars(cssVariables('dark')) };

type Theme = { scheme: ColorScheme; colors: (typeof colors)[ColorScheme] };
const ThemeContext = createContext<Theme>({ scheme: 'light', colors: colors.light });

/**
 * Follows the system appearance by default (Apple HIG). Every class like `bg-surface` resolves through
 * CSS variables set here, so switching theme never needs a different class name.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const preference = usePrefs((s) => s.theme);
  const scheme: ColorScheme = preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference;
  const value = useMemo(() => ({ scheme, colors: colors[scheme] }), [scheme]);

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View style={[{ flex: 1 }, themeVars[scheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

/** Raw colour values, for the few APIs that can't take a class (navigation theme, placeholder colour). */
export const useTheme = () => useContext(ThemeContext);
