import type { Preview } from '@storybook/react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, usePrefs } from '@zahln/mobile-core';
import { type ReactNode, useLayoutEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, ToastHost } from '../src';

/**
 * Every story renders inside the same providers as the apps. `parameters.theme` / `parameters.locale` pick
 * light or dark and German or English, so each component is reviewed in every combination that ships.
 */
/** Applies the story's theme and language before the first paint (not during render, which React rejects). */
function Prefs({
  theme,
  locale,
  children,
}: {
  theme: 'light' | 'dark';
  locale: 'de' | 'en';
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);
  useLayoutEffect(() => {
    usePrefs.setState({ theme, locale });
    setReady(true);
  }, [theme, locale]);
  return ready ? children : null;
}

const preview: Preview = {
  decorators: [
    (Story, { parameters }) => {
      return (
        <Prefs theme={parameters.theme ?? 'light'} locale={parameters.locale ?? 'de'}>
          <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>
              <ThemeProvider>
                <View className="flex-1 bg-bg p-5">
                  <Story />
                </View>
                <ToastHost />
              </ThemeProvider>
            </QueryClientProvider>
          </SafeAreaProvider>
        </Prefs>
      );
    },
  ],
};

export default preview;
