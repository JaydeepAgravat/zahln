import { View } from 'react-native';
import { Text } from './Text';

export type StatusTone = 'success' | 'pending' | 'warning' | 'danger' | 'info' | 'neutral';

const styles: Record<StatusTone, { bg: string; text: string; icon: string }> = {
  success: { bg: 'bg-success-subtle', text: 'text-success', icon: '✓' },
  pending: { bg: 'bg-pending-subtle', text: 'text-pending', icon: '…' },
  warning: { bg: 'bg-warning-subtle', text: 'text-warning', icon: '!' },
  danger: { bg: 'bg-danger-subtle', text: 'text-danger', icon: '×' },
  info: { bg: 'bg-info-subtle', text: 'text-info', icon: 'i' },
  neutral: { bg: 'bg-surface-raised', text: 'text-text-secondary', icon: '•' },
};

/** Icon + text + colour: status is never carried by colour alone. */
export function StatusBadge({ tone, label }: { tone: StatusTone; label: string }) {
  const s = styles[tone];
  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2 py-0.5 ${s.bg}`}
      accessibilityLabel={label}
    >
      <Text variant="caption" className={s.text} importantForAccessibility="no">
        {s.icon}
      </Text>
      <Text variant="caption" className={s.text}>
        {label}
      </Text>
    </View>
  );
}
