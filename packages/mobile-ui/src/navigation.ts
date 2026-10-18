import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTheme } from './theme';

/** React Navigation's theme, derived from our tokens so headers and transitions never flash the wrong colour. */
export function useNavigationTheme(): Theme {
  const { scheme, colors } = useTheme();
  return useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.brand,
        background: colors.bg,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
      },
    };
  }, [scheme, colors]);
}

/** Header-less, edge-to-edge onboarding stack with a minimal ember back chevron. */
export function useOnboardingScreenOptions(): NativeStackNavigationOptions {
  const { colors } = useTheme();
  return useMemo(
    () => ({
      headerTitle: '',
      animation: 'slide_from_right',
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
      headerTintColor: colors.brand,
      headerStyle: { backgroundColor: colors.bg },
      contentStyle: { backgroundColor: colors.bg },
    }),
    [colors],
  );
}
