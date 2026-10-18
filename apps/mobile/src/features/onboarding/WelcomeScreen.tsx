import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Icon, type IconName, Logo, PressableScale, Text, WelcomeIllustration } from '../../ds';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { useDraft } from './draft';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

function RoleCard({
  icon,
  title,
  hint,
  primary,
  onPress,
}: {
  icon: IconName;
  title: string;
  hint: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={onPress}
      hapticOnPress
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${hint}`}
      className={`flex-row items-center gap-4 rounded-lg p-4 ${primary ? 'bg-ink' : 'border border-border bg-surface'}`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-md ${primary ? 'bg-brand' : 'bg-surface-muted'}`}
      >
        <Icon name={icon} size={26} color={primary ? 'onBrand' : 'textPrimary'} weight="duotone" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text variant="headline" tone={primary ? 'on-ink' : 'primary'} style={{ fontFamily: 'Inter-Bold' }}>
          {title}
        </Text>
        <Text variant="footnote" tone={primary ? 'on-ink-muted' : 'secondary'}>
          {hint}
        </Text>
      </View>
      <Icon name="chevron" size={20} color={primary ? 'onInkMuted' : 'textTertiary'} weight="bold" />
    </PressableScale>
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
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center gap-2">
            <Logo size={32} />
            <Text variant="headline" style={{ fontFamily: 'Inter-Bold', letterSpacing: -0.4 }}>
              Zahln
            </Text>
          </View>
          <PressableScale
            onPress={() => setLocale(locale === 'de' ? 'en' : 'de')}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={locale === 'de' ? 'Switch to English' : 'Auf Deutsch wechseln'}
            className="h-10 flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3"
          >
            <Icon name="globe" size={16} color="textSecondary" />
            <Text variant="footnote" style={{ fontFamily: 'Inter-SemiBold' }}>
              {locale === 'de' ? 'EN' : 'DE'}
            </Text>
          </PressableScale>
        </View>

        <View className="flex-1 items-center justify-center">
          <WelcomeIllustration width={300} />
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(80)} className="gap-3 pb-6">
          <Text variant="hero" accessibilityRole="header">
            {t('onboarding.welcome.title')}
          </Text>
          <Text tone="secondary">{t('onboarding.welcome.subtitle')}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} className="gap-3">
          <RoleCard
            primary
            icon="student"
            title={t('onboarding.welcome.payer')}
            hint={t('onboarding.welcome.payerHint')}
            onPress={() => choose('consumer')}
          />
          <RoleCard
            icon="store"
            title={t('onboarding.welcome.merchant')}
            hint={t('onboarding.welcome.merchantHint')}
            onPress={() => choose('merchant')}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(500).delay(320)}
          className="flex-row items-center justify-center gap-1.5 py-4"
        >
          <Icon name="shield" size={16} color="textTertiary" weight="fill" />
          <Text variant="caption" tone="tertiary">
            {t('onboarding.welcome.trust')}
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
