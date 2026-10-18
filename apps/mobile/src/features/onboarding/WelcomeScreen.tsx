import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, View } from 'react-native';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Screen, Text } from '../../ds';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useDraft } from './draft';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

function RoleCard({ title, hint, onPress }: { title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      className="gap-1 rounded-lg border border-border bg-surface p-5"
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
    >
      <Text variant="headline">{title}</Text>
      <Text variant="callout" tone="secondary">
        {hint}
      </Text>
    </Pressable>
  );
}

export function WelcomeScreen({ navigation }: Props) {
  const { t, locale } = useT();
  const setLocale = usePrefs((s) => s.setLocale);
  const setDraft = useDraft((s) => s.set);

  const choose = (role: 'consumer' | 'merchant') => {
    setDraft({ role });
    navigation.navigate('Phone');
  };

  return (
    <Screen>
      <View className="flex-row justify-end">
        <Pressable
          onPress={() => setLocale(locale === 'de' ? 'en' : 'de')}
          accessibilityRole="button"
          accessibilityLabel={locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
          className="min-h-[48px] justify-center px-2"
        >
          <Text variant="callout" tone="brand">
            {locale === 'de' ? 'EN' : 'DE'}
          </Text>
        </Pressable>
      </View>
      <View className="flex-1 justify-center gap-3">
        <Text variant="display" accessibilityRole="header">
          Zahln
        </Text>
        <Text variant="title">{t('onboarding.welcome.title')}</Text>
        <Text variant="body" tone="secondary">
          {t('onboarding.welcome.subtitle')}
        </Text>
      </View>
      <View className="gap-3">
        <RoleCard
          title={t('onboarding.welcome.payer')}
          hint={t('onboarding.welcome.payerHint')}
          onPress={() => choose('consumer')}
        />
        <RoleCard
          title={t('onboarding.welcome.merchant')}
          hint={t('onboarding.welcome.merchantHint')}
          onPress={() => choose('merchant')}
        />
      </View>
    </Screen>
  );
}
