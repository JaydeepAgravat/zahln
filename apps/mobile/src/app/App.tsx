import '../../global.css';
import '../lib/i18n';
import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../ds';
import { ToastHost } from '../ds/Toast';
import { queryClient } from '../lib/queries';
import { uuid } from '../lib/random';
import { getOrCreateDeviceId } from '../lib/secure';
import { startAutoLock, useSession } from '../lib/session';
import { RootNavigator } from './navigation/RootNavigator';

// NativeWind's css-interop registers every RN component at startup, including ImageBackground,
// which trips RN 0.88's deprecation getter. We don't use ImageBackground. Remove when NativeWind 5 lands.
LogBox.ignoreLogs(['ImageBackground is deprecated']);

export function App() {
  const boot = useSession((s) => s.boot);

  useEffect(() => {
    void getOrCreateDeviceId(uuid).then(boot);
    return startAutoLock();
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
