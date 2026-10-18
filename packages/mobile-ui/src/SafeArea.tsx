import type { ReactNode } from 'react';
import { type StyleProp, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Edge = 'top' | 'bottom';

/**
 * Safe-area padding from the app-root provider (the window's insets).
 * Use it on screens presented as native full-screen modals: there, the native `SafeAreaView`
 * reports zero insets on iOS, which puts headers under the Dynamic Island.
 */
export function SafeArea({
  edges = ['top', 'bottom'],
  className,
  style,
  children,
}: {
  edges?: Edge[];
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className={className}
      style={[
        {
          paddingTop: edges.includes('top') ? insets.top : 0,
          paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
