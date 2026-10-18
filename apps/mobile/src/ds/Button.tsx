import { ActivityIndicator, type PressableProps, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';
import { useTheme } from './theme';

export type ButtonVariant = 'primary' | 'ink' | 'secondary' | 'tertiary' | 'destructive';

const styles = {
  primary: { container: 'bg-brand', tone: 'on-brand', icon: 'onBrand' },
  ink: { container: 'bg-ink', tone: 'on-ink', icon: 'onInk' },
  secondary: { container: 'bg-surface-muted', tone: 'primary', icon: 'textPrimary' },
  tertiary: { container: 'bg-transparent', tone: 'brand', icon: 'brandText' },
  destructive: { container: 'bg-danger-subtle', tone: 'danger', icon: 'danger' },
} as const;

type Props = Omit<PressableProps, 'children' | 'style'> & {
  title: string;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  loading?: boolean;
  icon?: IconName;
};

/**
 * Pill buttons. Ember (primary) appears at most once per screen; ink is the confident secondary.
 * 56 pt (lg) / 48 pt (md), spring press, light haptic.
 */
export function Button({
  title,
  variant = 'primary',
  size = 'lg',
  loading = false,
  disabled,
  icon,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const s = styles[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      hapticOnPress
      className={`flex-row items-center justify-center rounded-full px-6 ${s.container} ${
        size === 'lg' ? 'min-h-[56px]' : 'min-h-[48px]'
      } ${inactive && !loading ? 'opacity-40' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[s.icon]} />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? <Icon name={icon} size={22} color={s.icon} weight="bold" /> : null}
          <Text variant="headline" tone={s.tone} className="text-center" style={{ fontFamily: 'Inter-Bold' }}>
            {title}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

/** Round icon-only button (header actions). Always has an accessibility label. */
export function IconButton({
  icon,
  label,
  onPress,
  tone = 'surface',
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  tone?: 'surface' | 'ink';
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hapticOnPress
      scaleTo={0.9}
      className={`h-11 w-11 items-center justify-center rounded-full ${tone === 'ink' ? 'bg-ink' : 'bg-surface'}`}
    >
      <Icon name={icon} size={22} color={tone === 'ink' ? 'onInk' : 'textPrimary'} />
    </PressableScale>
  );
}
