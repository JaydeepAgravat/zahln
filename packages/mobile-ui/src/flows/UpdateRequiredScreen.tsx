import { appVersion, useRemoteConfig, useT } from '@zaster/mobile-core';
import { Linking, Platform, View } from 'react-native';
import { Button, Logo, Text } from '../ds';
import { SafeArea } from '../SafeArea';

/**
 * The forced-update gate. Rendered above everything (onboarding, lock, deep links), because a version
 * below `minSupportedVersion` may speak a protocol the server no longer accepts. Calm, not alarming:
 * the first thing it says after the ask is that the money is safe.
 */
export function UpdateRequiredScreen() {
  const { t } = useT();
  const config = useRemoteConfig();
  const store = Platform.OS === 'ios' ? 'https://apps.apple.com/' : 'https://play.google.com/store';
  return (
    <SafeArea className="flex-1 bg-bg px-6">
      <View className="flex-1 items-center justify-center gap-5">
        <Logo size={72} />
        <Text variant="title" accessibilityRole="header" className="text-center">
          {t('update.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t('update.body')}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontVariant: ['tabular-nums'] }}>
          {t('update.version', { current: appVersion(), min: config.minSupportedVersion })}
        </Text>
      </View>
      <View className="pb-4">
        <Button
          title={Platform.OS === 'ios' ? t('update.action') : t('update.actionAndroid')}
          icon="download"
          onPress={() => void Linking.openURL(store)}
        />
      </View>
    </SafeArea>
  );
}
