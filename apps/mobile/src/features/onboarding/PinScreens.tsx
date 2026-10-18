import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { isWeakPin, PIN_LENGTH } from '@zahln/shared';
import { useState } from 'react';
import { View } from 'react-native';
import type { OnboardingStackParamList } from '../../app/navigation/types';
import { Keypad, type KeypadKey, PinDots, Screen, Text } from '../../ds';
import { useT } from '../../lib/i18n';
import { useDraft } from './draft';

/** Collects 6 digits with the shared keypad and calls `onComplete` once. */
export function usePinEntry(onComplete: (pin: string) => void) {
  const [pin, setPin] = useState('');
  const onKey = (key: KeypadKey) => {
    if (key === 'backspace') return setPin((p) => p.slice(0, -1));
    if (key === 'biometric' || key === '00') return;
    setPin((p) => {
      const next = (p + key).slice(0, PIN_LENGTH);
      if (next.length === PIN_LENGTH) setTimeout(() => onComplete(next), 120);
      return next;
    });
  };
  return { pin, onKey, reset: () => setPin('') };
}

function PinLayout(props: {
  title: string;
  subtitle?: string;
  error?: string | null;
  pin: string;
  onKey: (k: KeypadKey) => void;
}) {
  return (
    <Screen scroll={false}>
      <View className="flex-1 justify-center gap-3">
        <Text variant="title" accessibilityRole="header" className="text-center">
          {props.title}
        </Text>
        {props.subtitle ? (
          <Text tone="secondary" className="text-center">
            {props.subtitle}
          </Text>
        ) : null}
        <PinDots length={props.pin.length} error={!!props.error} />
        <Text
          variant="footnote"
          tone="danger"
          className="min-h-[18px] text-center"
          accessibilityLiveRegion="assertive"
        >
          {props.error ?? ''}
        </Text>
      </View>
      <Keypad mode="pin" onKey={props.onKey} />
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
    if (isWeakPin(pin)) {
      setError(t('onboarding.pin.weak'));
      entry.reset();
      return;
    }
    setError(null);
    setDraft({ pin });
    entry.reset();
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
    if (pin !== draft.pin) {
      setError(t('onboarding.pin.mismatch'));
      entry.reset();
      return;
    }
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
