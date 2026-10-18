import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

type ToastState = { message: string | null; icon: IconName; id: number };
const useToastStore = create<ToastState>(() => ({ message: null, icon: 'info', id: 0 }));

/** Show a short, non-blocking message (instead of a native alert). */
export function toast(message: string, icon: IconName = 'info') {
  useToastStore.setState((s) => ({ message, icon, id: s.id + 1 }));
}

/** Mounted once at the app root. Ink pill at the top, announced to screen readers, gone after 2.4 s. */
export function ToastHost() {
  const { message, icon, id } = useToastStore();
  const insets = useSafeAreaInsets();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `id` restarts the timer when the same message is shown again
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => useToastStore.setState({ message: null }), 2400);
    return () => clearTimeout(timer);
  }, [message, id]);
  if (!message) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 8, left: 0, right: 0, alignItems: 'center' }}
    >
      <Animated.View
        key={id}
        entering={FadeInUp.springify().damping(18)}
        exiting={FadeOutUp.duration(160)}
        className="flex-row items-center gap-2 rounded-full bg-ink px-4 py-3"
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
      >
        <Icon name={icon} size={18} color="onInk" weight="fill" />
        <Text variant="callout" tone="on-ink" style={{ fontFamily: 'Inter-SemiBold' }}>
          {message}
        </Text>
      </Animated.View>
    </View>
  );
}
