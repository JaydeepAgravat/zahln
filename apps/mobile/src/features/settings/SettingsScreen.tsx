import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Button, Card, Text, useTheme } from '../../ds';
import { api } from '../../lib/api';
import { useBiometry } from '../../lib/biometrics';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { queryClient } from '../../lib/queries';
import { randomSecret } from '../../lib/random';
import { enableBiometricUnlock } from '../../lib/secure';
import { useSession } from '../../lib/session';

function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {props.options.map((o) => (
        <Pressable
          key={o.value}
          onPress={() => props.onChange(o.value)}
          accessibilityRole="radio"
          accessibilityState={{ selected: o.value === props.value }}
          className={`min-h-[44px] flex-1 items-center justify-center rounded-full border ${
            o.value === props.value ? 'border-brand bg-brand-subtle' : 'border-border bg-surface'
          }`}
        >
          <Text variant="callout" tone={o.value === props.value ? 'brand' : 'secondary'}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function SettingsScreen() {
  const { t } = useT();
  const prefs = usePrefs();
  const session = useSession();
  const biometry = useBiometry();
  const { colors } = useTheme();

  const toggleBiometrics = async (on: boolean) => {
    // Turning it on stores a fresh secret behind BIOMETRY_CURRENT_SET; turning it off just stops asking.
    prefs.setBiometricsEnabled(on ? await enableBiometricUnlock(randomSecret()) : false);
  };

  const signOut = async () => {
    await api('/devices/current', z.null(), { method: 'DELETE' }).catch(() => null);
    queryClient.clear();
    await session.signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-5 py-4">
        <Text variant="title" accessibilityRole="header">
          {t('settings.title')}
        </Text>
        <Card>
          <Text variant="callout" tone="secondary">
            {t('settings.account')}
          </Text>
          <Text variant="headline">{session.user?.name ?? ''}</Text>
          <Text tone="secondary">{session.user?.phone ?? ''}</Text>
        </Card>
        <View className="gap-2">
          <Text variant="callout" tone="secondary">
            {t('settings.language')}
          </Text>
          <Segmented
            value={prefs.locale}
            onChange={prefs.setLocale}
            options={[
              { value: 'de', label: 'Deutsch' },
              { value: 'en', label: 'English' },
            ]}
          />
        </View>
        <View className="gap-2">
          <Text variant="callout" tone="secondary">
            {t('settings.theme')}
          </Text>
          <Segmented
            value={prefs.theme}
            onChange={prefs.setTheme}
            options={[
              { value: 'system', label: t('settings.themeSystem') },
              { value: 'light', label: t('settings.themeLight') },
              { value: 'dark', label: t('settings.themeDark') },
            ]}
          />
        </View>
        {biometry?.available ? (
          <View className="min-h-[48px] flex-row items-center justify-between">
            <Text>{t('settings.biometrics')}</Text>
            <Switch
              value={prefs.biometricsEnabled}
              onValueChange={(on) => void toggleBiometrics(on)}
              trackColor={{ true: colors.brand, false: colors.borderStrong }}
              accessibilityLabel={t('settings.biometrics')}
            />
          </View>
        ) : null}
        <View className="gap-3">
          <Button title={t('settings.lockNow')} variant="secondary" onPress={session.lock} />
          <Button title={t('settings.signOut')} variant="destructive" onPress={signOut} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
