import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { appKind, usePrefs, useT } from '@zaster/mobile-core';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Icon, Logo, PressableScale, Text, TillIllustration, WelcomeIllustration } from '../../ds';
import { useDraft } from './draft';
import type { OnboardingStackParamList } from './types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const { t, locale } = useT();
  const setLocale = usePrefs((s) => s.setLocale);
  const setDraft = useDraft((s) => s.set);

  const kind = appKind();
  const merchant = kind === 'merchant';
  const start = () => {
    setDraft({ role: kind });
    navigation.navigate('Phone');
  };

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1 px-5">
        <View className="flex-row items-center justify-between pt-2">
          <View className="flex-row items-center gap-2">
            <Logo size={32} />
            <Text
              variant="headline"
              style={{ fontFamily: 'Inter-Bold', letterSpacing: merchant ? 1.2 : -0.4 }}
            >
              {merchant ? 'Zettel' : 'Zaster'}
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
          {merchant ? <TillIllustration width={300} /> : <WelcomeIllustration width={300} />}
        </View>

        <Animated.View entering={FadeInDown.duration(500).delay(80)} className="gap-3 pb-6">
          <Text variant="hero" accessibilityRole="header">
            {t(merchant ? 'onboarding.welcome.merchantTitle' : 'onboarding.welcome.title')}
          </Text>
          <Text tone="secondary">
            {t(merchant ? 'onboarding.welcome.merchantSubtitle' : 'onboarding.welcome.subtitle')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} className="gap-3">
          <Button title={t('onboarding.welcome.start')} onPress={start} />
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
