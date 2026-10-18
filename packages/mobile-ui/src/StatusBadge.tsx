import { View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type StatusTone = 'success' | 'pending' | 'warning' | 'danger' | 'info' | 'neutral';

const styles = {
  success: { bg: 'bg-success-subtle', text: 'text-success', color: 'success', icon: 'checkCircle' },
  pending: { bg: 'bg-pending-subtle', text: 'text-pending', color: 'pending', icon: 'instant' },
  warning: { bg: 'bg-warning-subtle', text: 'text-warning', color: 'warning', icon: 'warning' },
  danger: { bg: 'bg-danger-subtle', text: 'text-danger', color: 'danger', icon: 'close' },
  info: { bg: 'bg-info-subtle', text: 'text-info', color: 'info', icon: 'info' },
  neutral: { bg: 'bg-surface-muted', text: 'text-text-secondary', color: 'textSecondary', icon: null },
} as const;

/**
 * Status pills: icon + text + colour, so a status is never carried by colour alone.
 * Pass `icon={null}` for plain labels (plan names, roles).
 */
export function StatusBadge({
  tone,
  label,
  icon,
}: {
  tone: StatusTone;
  label: string;
  icon?: IconName | null;
}) {
  const s = styles[tone];
  const glyph = icon === undefined ? s.icon : icon;
  return (
    <View
      className={`flex-row items-center gap-1 self-start rounded-full px-2.5 py-1 ${s.bg}`}
      accessibilityLabel={label}
    >
      {glyph ? <Icon name={glyph} size={13} color={s.color} weight="fill" /> : null}
      <Text variant="caption" className={s.text} style={{ fontFamily: 'Inter-SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}
