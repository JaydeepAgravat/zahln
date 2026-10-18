import {
  checkPin,
  haptic,
  pinLockedForMs,
  unlockWithBiometrics,
  useBiometry,
  usePrefs,
  useSession,
  useT,
} from '@zahln/mobile-core';
import { useSecureScreen } from '@zahln/secure-screen';
import { MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN } from '@zahln/shared';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar, type KeypadKey, Logo } from '../../ds';
import { PinLayout, usePinEntry } from '../onboarding/PinScreens';

/**
 * Shown on every cold start and after 60 s in the background.
 * Biometrics first (if enabled), PIN as the fallback, with a growing cooldown after 5 wrong PINs.
 */
export function LockScreen() {
  // No screenshots of the PIN pad, and no app-switcher snapshot of it.
  useSecureScreen();
  const { t } = useT();
  const unlock = useSession((s) => s.unlock);
  const firstName = usePrefs((s) => s.firstName);
  const biometricsEnabled = usePrefs((s) => s.biometricsEnabled);
  const biometry = useBiometry();
  const [error, setError] = useState<string | null>(null);
  const [lockedMs, setLockedMs] = useState(0);

  const tryBiometrics = useCallback(async () => {
    const result = await unlockWithBiometrics({ title: t('lock.prompt'), cancel: t('lock.usePin') });
    if (result === 'ok') {
      haptic.success();
      await unlock();
    }
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
      haptic.success();
      await unlock();
      return;
    }
    haptic.error();
    if (result.lockedForMs > 0) {
      setLockedMs(result.lockedForMs);
      setError(t('lock.locked', { seconds: Math.ceil(result.lockedForMs / 1000) }));
    } else {
      setError(t('lock.wrong', { left: MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN - result.failed }));
    }
  });

  const onKey = (key: KeypadKey) => {
    if (key === 'biometric') return void tryBiometrics();
    if (error && lockedMs <= 0) setError(null);
    entry.onKey(key);
  };

  return (
    <PinLayout
      header={
        <View className="pb-1">{firstName ? <Avatar name={firstName} size={64} /> : <Logo size={64} />}</View>
      }
      title={firstName ? t('lock.hello', { name: firstName }) : t('lock.title')}
      subtitle={t('lock.subtitle')}
      error={lockedMs > 0 ? t('lock.locked', { seconds: Math.ceil(lockedMs / 1000) }) : error}
      pin={entry.pin}
      onKey={onKey}
      disabled={lockedMs > 0}
      biometricIcon={biometricsEnabled && biometry?.available ? biometry.icon : null}
    />
  );
}
