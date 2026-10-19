import '../../global.css';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  getOrCreateDeviceId,
  prefetchBiometry,
  queryClient,
  startAutoLock,
  startRemoteConfig,
  useSession,
  uuid,
} from '@zahln/mobile-core';
import { ThemeProvider, ToastHost } from '@zahln/mobile-ui';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './navigation/RootNavigator';

// NativeWind's css-interop registers every RN component at startup, including ImageBackground,
// which trips RN 0.88's deprecation getter. We don't use ImageBackground. Remove when NativeWind 5 lands.
// `[zahln]` lines come from our logger: handled conditions (a dropped request the app recovers from),
// still printed to the console, but not worth a warning toast over the screen.
LogBox.ignoreLogs(['ImageBackground is deprecated', /^\[zahln\] /]);

export function App() {
  const boot = useSession((s) => s.boot);

  useEffect(() => {
    void getOrCreateDeviceId(uuid).then(boot);
    void prefetchBiometry();
    const stopConfig = startRemoteConfig();
    const stopLock = startAutoLock();
    return () => {
      stopConfig();
      stopLock();
    };
  }, [boot]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
            <ToastHost />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
