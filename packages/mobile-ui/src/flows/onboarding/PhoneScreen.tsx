import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api, haptic, useT } from '@zaster/mobile-core';
import { normalizeGermanPhone, PhoneSchema, RequestOtpResponseSchema } from '@zaster/shared';
import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, CodeIllustration, Icon, Text, useTheme } from '../../ds';
import { useDraft } from './draft';
import { OnboardingLayout } from './OnboardingLayout';
import type { OnboardingStackParamList } from './types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Phone'>;

export function PhoneScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const setDraft = useDraft((s) => s.set);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const submit = async () => {
    const digits = value.replace(/\D/g, '');
    const phone = normalizeGermanPhone(digits.startsWith('0') ? digits : `0${digits}`);
    if (!PhoneSchema.safeParse(phone).success) {
      haptic.error();
      setError(t('onboarding.phone.invalid'));
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      const res = await api('/auth/otp', RequestOtpResponseSchema, { method: 'POST', body: { phone } });
      setDraft({ phone, challengeId: res.challengeId, devCode: res.devCode ?? null });
      navigation.navigate('Otp');
    } catch {
      haptic.error();
      setError(t('common.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout
      step="phone"
      illustration={<CodeIllustration size={96} />}
      title={t('onboarding.phone.title')}
      subtitle={t('onboarding.phone.subtitle')}
      footer={
        <Button title={t('common.continue')} onPress={submit} loading={loading} disabled={value.length < 6} />
      }
    >
      <View
        className={`h-16 flex-row items-center rounded-md border-2 bg-surface ${
          error ? 'border-danger' : focused ? 'border-brand' : 'border-border'
        }`}
      >
        <View className="h-full flex-row items-center gap-2 border-r border-border px-4">
          <Text variant="headline">🇩🇪</Text>
          <Text variant="headline" style={{ fontFamily: 'Inter-SemiBold' }}>
            {t('onboarding.phone.prefix')}
          </Text>
        </View>
        <TextInput
          value={value}
          onChangeText={(v) => {
            // A German mobile number has at most 11 digits after +49 (12 with a leading 0): stop there.
            const cleaned = v.replace(/[^\d ]/g, '');
            let digits = 0;
            setValue(
              [...cleaned]
                .filter((c) => c === ' ' || ++digits <= 12)
                .join('')
                .trimEnd(),
            );
            if (error) setError(undefined);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t('onboarding.phone.placeholder')}
          placeholderTextColor={colors.textTertiary}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoFocus
          accessibilityLabel={t('onboarding.phone.label')}
          onSubmitEditing={submit}
          className="h-full flex-1 px-4 text-text-primary"
          style={{ fontFamily: 'Inter-SemiBold', fontSize: 20, letterSpacing: 0.5 }}
        />
      </View>
      {error ? (
        <View className="flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
          <Icon name="warning" size={16} color="danger" weight="fill" />
          <Text variant="footnote" tone="danger">
            {error}
          </Text>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}
