import {
  api,
  enableBiometricUnlock,
  haptic,
  prettyPhone,
  queryClient,
  randomSecret,
  useBiometry,
  useMe,
  usePrefs,
  useSession,
  useT,
} from '@zahln/mobile-core';
import type { ReactNode } from 'react';
import { ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { Avatar, ListRow, Logo, PressableScale, Text, useTheme } from '../../ds';

function Segmented<T extends string>(props: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View className="flex-row rounded-full bg-surface-muted p-1">
      {props.options.map((o) => {
        const active = o.value === props.value;
        return (
          <PressableScale
            key={o.value}
            onPress={() => {
              haptic.select();
              props.onChange(o.value);
            }}
            scaleTo={0.95}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            className={`min-h-[36px] items-center justify-center rounded-full px-3 ${active ? 'bg-surface-raised' : ''}`}
          >
            <Text
              variant="footnote"
              tone={active ? 'primary' : 'secondary'}
              style={{ fontFamily: 'Inter-SemiBold' }}
            >
              {o.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-1">
      <Text
        variant="caption"
        tone="tertiary"
        className="px-1 uppercase"
        style={{ letterSpacing: 0.8 }}
        accessibilityRole="header"
      >
        {title}
      </Text>
      <View className="rounded-lg border border-border bg-surface px-4">{children}</View>
    </View>
  );
}

const Divider = () => <View className="ml-14 h-px bg-border" />;

export function SettingsScreen() {
  const { t } = useT();
  const prefs = usePrefs();
  const session = useSession();
  const me = useMe();
  const biometry = useBiometry();
  const { colors } = useTheme();
  const user = me.data?.user ?? session.user;

  const toggleBiometrics = async (on: boolean) => {
    haptic.select();
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
      <ScrollView contentContainerClassName="gap-6 px-5 pb-12 pt-2">
        <Text variant="display" accessibilityRole="header">
          {t('tabs.profile')}
        </Text>

        <View className="flex-row items-center gap-4 rounded-xl bg-ink p-5">
          <Avatar name={user?.name ?? ''} size={56} />
          <View className="flex-1 gap-0.5">
            <Text variant="headline" tone="on-ink" style={{ fontFamily: 'Inter-Bold' }}>
              {user?.name ?? ''}
            </Text>
            <Text variant="footnote" tone="on-ink-muted">
              {user?.phone ? prettyPhone(user.phone) : ''}
            </Text>
          </View>
        </View>

        <Section title={t('settings.sectionApp')}>
          <ListRow
            icon="language"
            title={t('settings.language')}
            trailing={
              <Segmented
                value={prefs.locale}
                onChange={prefs.setLocale}
                options={[
                  { value: 'de', label: 'DE' },
                  { value: 'en', label: 'EN' },
                ]}
              />
            }
          />
          <Divider />
          <ListRow icon={prefs.theme === 'dark' ? 'moon' : 'sun'} title={t('settings.theme')} />
          <View className="pb-3 pl-14">
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
        </Section>

        <Section title={t('settings.sectionSecurity')}>
          {biometry?.available ? (
            <>
              <ListRow
                icon={biometry.icon ?? 'fingerprint'}
                title={t('settings.biometrics')}
                trailing={
                  <Switch
                    value={prefs.biometricsEnabled}
                    onValueChange={(on) => void toggleBiometrics(on)}
                    trackColor={{ true: colors.brand, false: colors.borderStrong }}
                    thumbColor={colors.surfaceRaised}
                    accessibilityLabel={t('settings.biometrics')}
                  />
                }
              />
              <Divider />
            </>
          ) : null}
          <ListRow icon="lock" title={t('settings.lockNow')} chevron onPress={session.lock} />
          <Divider />
          <ListRow
            icon="signOut"
            iconColor="danger"
            iconBackground="bg-danger-subtle"
            title={t('settings.signOut')}
            chevron
            onPress={() => void signOut()}
          />
        </Section>

        <View className="items-center gap-2 pt-2">
          <Logo size={36} />
          <Text variant="caption" tone="tertiary">
            {t('settings.version')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
