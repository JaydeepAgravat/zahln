import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName, PressableScale, Text } from '../../ds';
import { haptic } from '../../lib/haptics';

const ICON: Record<string, IconName> = {
  Wallet: 'wallet',
  Till: 'qr',
  MerchantWallet: 'wallet',
  Settings: 'profile',
};

/** Custom tab bar: Phosphor icons (filled when active), ember indicator, haptic tick, 56 pt targets. */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row border-t border-border bg-surface px-2 pt-2"
      style={{ paddingBottom: Math.max(insets.bottom, 10) }}
      accessibilityRole="tablist"
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const label = (descriptors[route.key]?.options.title ?? route.name) as string;
        return (
          <PressableScale
            key={route.key}
            scaleTo={0.9}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) {
                haptic.select();
                navigation.navigate(route.name, route.params);
              }
            }}
            className="min-h-[56px] flex-1 items-center justify-center gap-1"
          >
            <Icon
              name={ICON[route.name] ?? 'wallet'}
              size={26}
              color={focused ? 'brandText' : 'textTertiary'}
              weight={focused ? 'fill' : 'regular'}
            />
            <Text
              variant="caption"
              tone={focused ? 'brand' : 'tertiary'}
              style={{ fontFamily: focused ? 'Inter-Bold' : 'Inter-Medium' }}
            >
              {label}
            </Text>
            <View className={`h-1 w-5 rounded-full ${focused ? 'bg-brand' : 'bg-transparent'}`} />
          </PressableScale>
        );
      })}
    </View>
  );
}
