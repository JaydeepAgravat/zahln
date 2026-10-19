import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ApiRequestError, api, haptic, prettyPhone, useT } from '@zaster/mobile-core';
import { OTP_LENGTH, RequestOtpResponseSchema, VerifyOtpResponseSchema } from '@zaster/shared';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Icon, OtpInput, Text, useTheme } from '../../ds';
import { useDraft } from './draft';
import { OnboardingLayout } from './OnboardingLayout';
import type { OnboardingStackParamList } from './types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Otp'>;

const RESEND_AFTER_S = 30;

export function OtpScreen({ navigation }: Props) {
  const { t } = useT();
  const { colors } = useTheme();
  const draft = useDraft();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER_S);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const verify = async (value: string) => {
    if (value.length !== OTP_LENGTH || !draft.challengeId) return;
    setLoading(true);
    setError(undefined);
    try {
      const res = await api('/auth/verify', VerifyOtpResponseSchema, {
        method: 'POST',
        body: { challengeId: draft.challengeId, code: value },
      });
      haptic.success();
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
      haptic.error();
      const reason = e instanceof ApiRequestError ? e.code : 'network';
      setError(
        reason === 'otp_expired'
          ? t('onboarding.otp.expired')
          : reason === 'otp_too_many_attempts'
            ? t('onboarding.otp.tooMany')
            : reason === 'network'
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
    setWait(RESEND_AFTER_S);
  };

  return (
    <OnboardingLayout
      step="otp"
      title={t('onboarding.otp.title')}
      subtitle={t('onboarding.otp.subtitle', { phone: prettyPhone(draft.phone) })}
      footer={
        <Button
          variant="secondary"
          size="md"
          title={wait > 0 ? t('onboarding.otp.resendIn', { seconds: wait }) : t('onboarding.otp.resend')}
          disabled={wait > 0}
          onPress={resend}
        />
      }
    >
      <OtpInput
        label={t('onboarding.otp.label')}
        value={code}
        error={!!error}
        onChange={(digits) => {
          setCode(digits);
          if (error) setError(undefined);
          if (digits.length === OTP_LENGTH) void verify(digits);
        }}
      />
      <View className="min-h-[24px] flex-row items-center gap-2" accessibilityLiveRegion="polite">
        {loading ? <ActivityIndicator color={colors.brandText} /> : null}
        {error ? (
          <>
            <Icon name="warning" size={16} color="danger" weight="fill" />
            <Text variant="footnote" tone="danger">
              {error}
            </Text>
          </>
        ) : null}
      </View>
      {draft.devCode ? (
        <View className="flex-row items-center gap-2 self-start rounded-full bg-accent-subtle px-3 py-1.5">
          <Icon name="sparkle" size={14} color="accentText" weight="fill" />
          <Text variant="footnote" tone="accent" style={{ fontFamily: 'Inter-SemiBold' }}>
            {t('common.devHint', { code: draft.devCode })}
          </Text>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}
