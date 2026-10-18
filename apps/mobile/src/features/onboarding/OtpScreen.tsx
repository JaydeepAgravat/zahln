import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OTP_LENGTH, RequestOtpResponseSchema, VerifyOtpResponseSchema } from '@zahln/shared';
import { useState } from 'react';
import { View } from 'react-native';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Button, Card, Screen, Text, TextField } from '../../ds';
import { ApiRequestError, api } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { useDraft } from './draft';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Otp'>;

export function OtpScreen({ navigation }: Props) {
  const { t } = useT();
  const draft = useDraft();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

  const verify = async (value = code) => {
    if (value.length !== OTP_LENGTH || !draft.challengeId) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await api('/auth/verify', VerifyOtpResponseSchema, {
        method: 'POST',
        body: { challengeId: draft.challengeId, code: value },
      });
      draft.set({
        verificationToken: res.verificationToken,
        isNewUser: res.isNewUser,
        name: res.name ?? '',
        memberships: res.memberships,
      });
      if (res.isNewUser) navigation.navigate('Name');
      else if (draft.role === 'merchant') navigation.navigate('Merchant');
      else navigation.navigate('PinCreate');
    } catch (e) {
      const code = e instanceof ApiRequestError ? e.code : 'network';
      setError(
        code === 'otp_expired'
          ? t('onboarding.otp.expired')
          : code === 'otp_too_many_attempts'
            ? t('onboarding.otp.tooMany')
            : code === 'network'
              ? t('common.networkError')
              : t('onboarding.otp.invalid'),
      );
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const res = await api('/auth/otp', RequestOtpResponseSchema, {
      method: 'POST',
      body: { phone: draft.phone },
    });
    draft.set({ challengeId: res.challengeId, devCode: res.devCode ?? null });
    setError(undefined);
    setCode('');
  };

  return (
    <Screen
      footer={
        <View className="gap-3">
          <Button
            title={t('common.continue')}
            onPress={() => verify()}
            loading={loading}
            disabled={code.length !== OTP_LENGTH}
          />
          <Button title={t('onboarding.otp.resend')} variant="tertiary" onPress={resend} />
        </View>
      }
    >
      <Text variant="title" accessibilityRole="header">
        {t('onboarding.otp.title')}
      </Text>
      <Text tone="secondary">{t('onboarding.otp.subtitle', { phone: draft.phone })}</Text>
      <TextField
        label={t('onboarding.otp.label')}
        value={code}
        onChangeText={(v) => {
          const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
          setCode(digits);
          if (digits.length === OTP_LENGTH) void verify(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={OTP_LENGTH}
        error={error}
        style={{ fontFamily: 'Inter-Medium', fontSize: 28, letterSpacing: 8, fontVariant: ['tabular-nums'] }}
      />
      {draft.devCode ? (
        <Card className="bg-info-subtle">
          <Text variant="footnote" className="text-info">
            {t('common.devHint', { code: draft.devCode })}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
