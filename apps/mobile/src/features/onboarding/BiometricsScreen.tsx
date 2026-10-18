import { SessionResponseSchema } from '@zahln/shared';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, FaceScanIllustration, Icon, ShieldIllustration, Text } from '../../ds';
import { api } from '../../lib/api';
import { useBiometry } from '../../lib/biometrics';
import { haptic } from '../../lib/haptics';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { randomSecret } from '../../lib/random';
import { enableBiometricUnlock, savePin, saveSession, unlockWithBiometrics } from '../../lib/secure';
import { useSession } from '../../lib/session';
import { useDraft } from './draft';
import { OnboardingLayout } from './OnboardingLayout';

/**
 * Last step: optionally enable biometrics, then bind this device to the account.
 * Only here do secrets get persisted, into the keychain.
 */
export function BiometricsScreen() {
  const { t } = useT();
  const biometry = useBiometry();
  const draft = useDraft();
  const deviceId = useSession((s) => s.deviceId);
  const completeOnboarding = useSession((s) => s.completeOnboarding);
  const prefs = usePrefs();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async (withBiometrics: boolean) => {
    if (!draft.verificationToken || !draft.pin || !deviceId || !draft.role) return;
    setBusy(true);
    setError(null);
    try {
      let biometricsOn = false;
      if (withBiometrics) {
        // Store the secret, then read it back once: proves Face ID works before we rely on it.
        biometricsOn =
          (await enableBiometricUnlock(randomSecret())) &&
          (await unlockWithBiometrics({
            title: t('onboarding.biometrics.prompt'),
            cancel: t('lock.cancel'),
          })) === 'ok';
      }

      const session = await api('/devices', SessionResponseSchema, {
        method: 'POST',
        body: {
          verificationToken: draft.verificationToken,
          deviceId,
          platform: Platform.OS === 'ios' ? 'ios' : 'android',
          ...(draft.isNewUser ? { name: draft.name } : {}),
        },
      });

      await savePin(draft.pin);
      await saveSession({ token: session.sessionToken, userId: session.user.id });
      prefs.setBiometricsEnabled(biometricsOn);
      prefs.setFirstName(session.user.name.split(' ')[0] ?? null);
      prefs.setRole(draft.role, draft.role === 'merchant' ? draft.merchantId : null);
      draft.clear();
      haptic.success();
      completeOnboarding(
        { token: session.sessionToken, userId: session.user.id },
        session.user,
        session.memberships,
      );
    } catch {
      haptic.error();
      setError(t('common.networkError'));
      setBusy(false);
    }
  };

  if (!biometry) return null;
  const type = biometry.label;

  return (
    <OnboardingLayout
      step="biometrics"
      illustration={
        biometry.available ? <FaceScanIllustration size={120} /> : <ShieldIllustration size={104} />
      }
      title={
        biometry.available ? t('onboarding.biometrics.title', { type }) : t('onboarding.biometrics.doneTitle')
      }
      subtitle={
        biometry.available
          ? t('onboarding.biometrics.subtitle', { type })
          : t('onboarding.biometrics.notAvailable')
      }
      footer={
        biometry.available ? (
          <View className="gap-2">
            <Button
              title={t('onboarding.biometrics.enable', { type })}
              icon={biometry.icon ?? undefined}
              onPress={() => finish(true)}
              loading={busy}
            />
            <Button
              title={t('common.skip')}
              variant="tertiary"
              size="md"
              onPress={() => finish(false)}
              disabled={busy}
            />
          </View>
        ) : (
          <Button title={t('common.continue')} onPress={() => finish(false)} loading={busy} />
        )
      }
    >
      {error ? (
        <View
          className="flex-row items-center gap-2 rounded-md bg-danger-subtle p-3"
          accessibilityLiveRegion="polite"
        >
          <Icon name="warning" size={18} color="danger" weight="fill" />
          <Text tone="danger" className="flex-1">
            {error}
          </Text>
        </View>
      ) : null}
    </OnboardingLayout>
  );
}
