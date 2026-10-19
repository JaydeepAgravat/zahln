import { useConfigOffline, useRemoteConfig, useT, useUpdateStatus } from '@zaster/mobile-core';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

/**
 * One line at the top of the home screens, by priority: offline (running on saved data),
 * an ops message from the console (e.g. maintenance), or a soft "new version" nudge.
 */
export function ConfigBanner() {
  const { t, locale } = useT();
  const offline = useConfigOffline();
  const config = useRemoteConfig();
  const update = useUpdateStatus();

  let banner: { icon: IconName; text: string; tone: 'warning' | 'info' } | null = null;
  if (offline) banner = { icon: 'cloudOff', text: t('offline.banner'), tone: 'warning' };
  else if (config.banner) banner = { icon: 'info', text: config.banner[locale], tone: 'info' };
  else if (update === 'available') banner = { icon: 'download', text: t('update.available'), tone: 'info' };
  if (!banner) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(240)}
      accessibilityRole="alert"
      className={`flex-row items-center gap-2 rounded-md px-3 py-2.5 ${banner.tone === 'warning' ? 'bg-warning-subtle' : 'bg-info-subtle'}`}
    >
      <Icon name={banner.icon} size={18} color={banner.tone} weight="fill" />
      <View className="flex-1">
        <Text variant="footnote" tone={banner.tone === 'warning' ? 'warning' : 'primary'}>
          {banner.text}
        </Text>
      </View>
    </Animated.View>
  );
}
