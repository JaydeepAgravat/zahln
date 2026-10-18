import { MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN } from '@zahln/shared';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Keypad, type KeypadKey, PinDots, Screen, Text } from '../../ds';
import { useBiometry } from '../../lib/biometrics';
import { useT } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import { checkPin, pinLockedForMs, unlockWithBiometrics } from '../../lib/secure';
import { useSession } from '../../lib/session';
import { usePinEntry } from '../onboarding/PinScreens';

/**
 * Shown on every cold start and after 60 s in the background.
 * Biometrics first (if enabled), PIN as the fallback, with a growing cooldown after 5 wrong PINs.
 */
export function LockScreen() {
  const { t } = useT();
  const unlock = useSession((s) => s.unlock);
  const user = useSession((s) => s.user);
  const biometricsEnabled = usePrefs((s) => s.biometricsEnabled);
  const biometry = useBiometry();
  const [error, setError] = useState<string | null>(null);
  const [lockedMs, setLockedMs] = useState(0);

  const tryBiometrics = useCallback(async () => {
    const result = await unlockWithBiometrics({ title: t('lock.prompt'), cancel: t('lock.usePin') });
    if (result === 'ok') await unlock();
  }, [t, unlock]);

  useEffect(() => {
    if (biometricsEnabled && biometry?.available) void tryBiometrics();
  }, [biometricsEnabled, biometry?.available, tryBiometrics]);

  useEffect(() => {
    void pinLockedForMs().then(setLockedMs);
  }, []);

  useEffect(() => {
    if (lockedMs <= 0) return;
    const timer = setInterval(() => setLockedMs((ms) => Math.max(0, ms - 1000)), 1000);
    return () => clearInterval(timer);
  }, [lockedMs]);

  const entry = usePinEntry(async (pin) => {
    const result = await checkPin(pin);
    entry.reset();
    if (result.ok) {
      setError(null);
      await unlock();
      return;
    }
    if (result.lockedForMs > 0) {
      setLockedMs(result.lockedForMs);
      setError(null);
    } else {
      setError(t('lock.wrong', { left: MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN - result.failed }));
    }
  });

  const onKey = (key: KeypadKey) => {
    if (key === 'biometric') return void tryBiometrics();
    if (error) setError(null);
    entry.onKey(key);
  };

  const message = lockedMs > 0 ? t('lock.locked', { seconds: Math.ceil(lockedMs / 1000) }) : (error ?? '');

  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center gap-3">
        <Text variant="title" accessibilityRole="header" className="text-center">
          {user ? t('home.hello', { name: user.name.split(' ')[0] }) : t('lock.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t('lock.subtitle')}
        </Text>
        <PinDots length={entry.pin.length} error={!!error} />
        <Text
          variant="footnote"
          tone="danger"
          className="min-h-[18px] text-center"
          accessibilityLiveRegion="assertive"
        >
          {message}
        </Text>
      </View>
      <Keypad
        mode="pin"
        onKey={onKey}
        disabled={lockedMs > 0}
        biometricGlyph={biometricsEnabled && biometry?.available ? biometry.glyph : null}
      />
    </Screen>
  );
}
