import type { ReactNode } from 'react';
import { View, type ViewProps } from 'react-native';

/**
 * Surface card: hairline border in both themes, no shadow in dark (elevation by surface step).
 * A `bg-*` in className replaces the default surface (both in one class string would be ambiguous).
 */
export function Card({
  children,
  className = '',
  ...rest
}: ViewProps & { children: ReactNode; className?: string }) {
  const background = /(^|\s)bg-/.test(className) ? '' : 'bg-surface';
  return (
    <View className={`gap-2 rounded-lg border border-border p-4 ${background} ${className}`} {...rest}>
      {children}
    </View>
  );
}
