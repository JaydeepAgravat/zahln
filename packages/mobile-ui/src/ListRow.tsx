import type { ColorToken } from '@zaster/shared/tokens';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  icon: IconName;
  iconColor?: ColorToken;
  iconBackground?: string;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  accessibilityLabel?: string;
};

/** Icon tile + title/subtitle + trailing slot. Used for transactions and settings, so both lists feel related. */
export function ListRow({
  icon,
  iconColor = 'textPrimary',
  iconBackground = 'bg-surface-muted',
  title,
  subtitle,
  trailing,
  onPress,
  chevron = false,
  accessibilityLabel,
}: Props) {
  const content = (
    <View className="min-h-[64px] flex-row items-center gap-3 py-2">
      <View className={`h-11 w-11 items-center justify-center rounded-md ${iconBackground}`}>
        <Icon name={icon} size={22} color={iconColor} weight="duotone" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="callout" style={{ fontFamily: 'Inter-SemiBold' }} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" tone="tertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron" size={18} color="textTertiary" /> : null}
    </View>
  );
  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel}>
        {content}
      </View>
    );
  }
  return (
    <PressableScale
      onPress={onPress}
      hapticOnPress
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {content}
    </PressableScale>
  );
}
