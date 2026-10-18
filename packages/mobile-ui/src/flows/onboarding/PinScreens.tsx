import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { haptic, useT } from '@zahln/mobile-core';
import { isWeakPin, PIN_LENGTH } from '@zahln/shared';
import { type ReactNode, useRef, useState } from 'react';
import { View } from 'react-native';
import { Keypad, type KeypadKey, PinDots, Screen, ShieldIllustration, Text } from '../../ds';
import { useDraft } from './draft';
import type { OnboardingStackParamList } from './types';

/** Collects 6 digits with the shared keypad and calls `onComplete` once per full entry. */
export function usePinEntry(onComplete: (pin: string) => void) {
  const [pin, setPin] = useState('');
  const done = useRef(onComplete);
  done.current = onComplete;
  const onKey = (key: KeypadKey) => {
    if (key === 'backspace') return setPin((p) => p.slice(0, -1));
    if (key === 'biometric' || key === '00') return;
    setPin((p) => {
      if (p.length >= PIN_LENGTH) return p;
      const next = p + key;
      if (next.length === PIN_LENGTH) setTimeout(() => done.current(next), 140);
      return next;
    });
  };
  return { pin, onKey, reset: () => setPin('') };
}

export function PinLayout(props: {
  header?: ReactNode;
  title: string;
  subtitle?: string;
  error?: string | null;
  pin: string;
  onKey: (k: KeypadKey) => void;
  biometricIcon?: 'faceId' | 'fingerprint' | null;
  disabled?: boolean;
}) {
  return (
    <Screen scroll={false}>
      <View className="flex-1 items-center justify-center gap-3">
        {props.header ?? <ShieldIllustration size={96} />}
        <Text variant="title" accessibilityRole="header" className="pt-2 text-center">
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text tone="secondary" className="px-4 text-center">
            {props.subtitle}
          </Text>
        ) : null}
        <PinDots length={props.pin.length} error={!!props.error} />
        <Text
          variant="footnote"
          tone="danger"
          className="min-h-[20px] text-center"
          accessibilityLiveRegion="assertive"
        >
          {props.error ?? ''}
        </Text>
      </View>
      <Keypad mode="pin" onKey={props.onKey} biometricIcon={props.biometricIcon} disabled={props.disabled} />
    </Screen>
  );
}

export function PinCreateScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'PinCreate'>) {
  const { t } = useT();
  const setDraft = useDraft((s) => s.set);
  const [error, setError] = useState<string | null>(null);
  const entry = usePinEntry((pin) => {
    entry.reset();
    if (isWeakPin(pin)) {
      haptic.error();
      setError(t('onboarding.pin.weak'));
      return;
    }
    setError(null);
    setDraft({ pin });
    navigation.navigate('PinConfirm');
  });
  return (
    <PinLayout
      title={t('onboarding.pin.createTitle')}
      subtitle={t('onboarding.pin.createSubtitle')}
      error={error}
      pin={entry.pin}
      onKey={(k) => {
        if (error) setError(null);
        entry.onKey(k);
      }}
    />
  );
}

export function PinConfirmScreen({
  navigation,
}: NativeStackScreenProps<OnboardingStackParamList, 'PinConfirm'>) {
  const { t } = useT();
  const draft = useDraft();
  const [error, setError] = useState<string | null>(null);
  const entry = usePinEntry((pin) => {
    entry.reset();
    if (pin !== draft.pin) {
      haptic.error();
      setError(t('onboarding.pin.mismatch'));
      return;
    }
    haptic.success();
    navigation.navigate('Biometrics');
  });
  return (
    <PinLayout
      title={t('onboarding.pin.confirmTitle')}
      error={error}
      pin={entry.pin}
      onKey={(k) => {
        if (error) setError(null);
        entry.onKey(k);
      }}
    />
  );
}
