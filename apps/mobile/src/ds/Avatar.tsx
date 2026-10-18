import { View } from 'react-native';
import { Text } from './Text';

/** Initials on ember: friendly without a photo, and never a stock face. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  return (
    <View
      className="items-center justify-center bg-brand"
      style={{ width: size, height: size, borderRadius: size * 0.34 }}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text variant={size >= 56 ? 'title' : 'callout'} tone="on-brand" style={{ fontFamily: 'Inter-Bold' }}>
        {initials || '·'}
      </Text>
    </View>
  );
}
