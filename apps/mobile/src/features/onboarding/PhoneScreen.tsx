import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { normalizeGermanPhone, PhoneSchema, RequestOtpResponseSchema } from '@zahln/shared';
import { useState } from 'react';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Screen, Text, TextField } from '../../ds';
import { api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useDraft } from './draft';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Phone'>;

export function PhoneScreen({ navigation }: Props) {
  const { t } = useT();
  const setDraft = useDraft((s) => s.set);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const phone = normalizeGermanPhone(value);
    if (!PhoneSchema.safeParse(phone).success) {
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
      setError(t('common.networkError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      footer={<Button title={t('common.continue')} onPress={submit} loading={loading} disabled={!value} />}
    >
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.phone.title')}
      </Text>
      <Text tone="secondary">{t('onboarding.phone.subtitle')}</Text>
      <TextField
        label={t('onboarding.phone.label')}
        placeholder={t('onboarding.phone.placeholder')}
        value={value}
        onChangeText={setValue}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        autoComplete="tel"
        autoFocus
        error={error}
        onSubmitEditing={submit}
      />
    </Screen>
  );
}
