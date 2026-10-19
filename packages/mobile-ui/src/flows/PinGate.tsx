import { checkPin, haptic, useT } from '@zaster/mobile-core';
import { useSecureScreen } from '@zaster/secure-screen';
import { MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN } from '@zaster/shared';
import { useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { Icon, PressableScale } from '../ds';
import { SafeArea } from '../SafeArea';
import { PinLayout, usePinEntry } from './onboarding/PinScreens';

/**
 * "Enter your PIN to continue" for the actions `requiredAuth` marks as PIN-only (data export, account deletion,
 * refunds, big payments). Biometrics are deliberately not offered here.
 */
export function PinGate({
  visible,
  title,
  subtitle,
  onSuccess,
  onCancel,
}: {
  visible: boolean;
  title: string;
  subtitle?: string;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [error, setError] = useState<string | null>(null);
  useSecureScreen(visible);
  const entry = usePinEntry(async (pin) => {
    const result = await checkPin(pin);
    entry.reset();
    if (result.ok) {
      setError(null);
      haptic.success();
      return onSuccess();
    }
    haptic.error();
    setError(
      result.lockedForMs > 0
        ? t('lock.locked', { seconds: Math.ceil(result.lockedForMs / 1000) })
        : t('lock.wrong', { left: MAX_PIN_ATTEMPTS_BEFORE_COOLDOWN - result.failed }),
    );
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeArea className="flex-1 bg-bg" edges={Platform.OS === 'ios' ? ['bottom'] : ['top', 'bottom']}>
        <View className="flex-row justify-end px-5 pt-4">
          <PressableScale
            onPress={onCancel}
            hapticOnPress
            accessibilityRole="button"
            accessibilityLabel={t('pay.close')}
            className="h-11 w-11 items-center justify-center rounded-full bg-surface"
          >
            <Icon name="close" size={22} color="textPrimary" />
          </PressableScale>
        </View>
        <PinLayout
          title={title}
          {...(subtitle ? { subtitle } : {})}
          error={error}
          pin={entry.pin}
          onKey={(k) => {
            if (error) setError(null);
            entry.onKey(k);
          }}
        />
      </SafeArea>
    </Modal>
  );
}
