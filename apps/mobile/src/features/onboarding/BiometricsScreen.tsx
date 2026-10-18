import { SessionResponseSchema } from '@zahln/shared';
import { useState } from 'react';
import { Platform, View } from 'react-native';
import { Button, Card, Screen, Text } from '../../ds';
import { api } from '../../lib/api';
import { useBiometry } from '../../lib/biometrics';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { randomSecret } from '../../lib/random';
import { enableBiometricUnlock, savePin, saveSession, unlockWithBiometrics } from '../../lib/secure';
import { useSession } from '../../lib/session';
import { useDraft } from './draft';

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
      prefs.setRole(draft.role, draft.role === 'merchant' ? draft.merchantId : null);
      draft.clear();
      completeOnboarding(
        { token: session.sessionToken, userId: session.user.id },
        session.user,
        session.memberships,
      );
    } catch {
      setError(t('common.networkError'));
      setBusy(false);
    }
  };

  if (!biometry) return null;
  const type = biometry.label;

  return (
    <Screen
      footer={
        biometry.available ? (
          <View className="gap-3">
            <Button
              title={t('onboarding.biometrics.enable', { type })}
              icon={biometry.glyph}
              onPress={() => finish(true)}
              loading={busy}
            />
            <Button
              title={t('common.skip')}
              variant="tertiary"
              onPress={() => finish(false)}
              disabled={busy}
            />
          </View>
        ) : (
          <Button title={t('common.continue')} onPress={() => finish(false)} loading={busy} />
        )
      }
    >
      <View className="flex-1 justify-center gap-3">
        <Text variant="display" className="text-center" importantForAccessibility="no">
          {biometry.glyph || '•'}
        </Text>
        <Text variant="title" accessibilityRole="header" className="text-center">
          {t('onboarding.biometrics.title', { type })}
        </Text>
        <Text tone="secondary" className="text-center">
          {biometry.available
            ? t('onboarding.biometrics.subtitle', { type })
            : t('onboarding.biometrics.notAvailable')}
        </Text>
        {busy ? (
          <Text variant="footnote" tone="tertiary" className="text-center">
            {t('onboarding.finishing')}
          </Text>
        ) : null}
        {error ? (
          <Card className="bg-danger-subtle">
            <Text className="text-danger">{error}</Text>
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}
