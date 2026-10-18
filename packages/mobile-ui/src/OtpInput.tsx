import { OTP_LENGTH } from '@zahln/shared';
import { type ComponentRef, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Text } from './Text';

/**
 * Six boxes, one real (invisible) TextInput underneath, so SMS autofill (oneTimeCode / sms-otp), paste
 * and screen readers all work like a normal field.
 */
export function OtpInput({
  value,
  onChange,
  error,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  label: string;
}) {
  const ref = useRef<ComponentRef<typeof TextInput>>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessible={false}>
      <View className="flex-row justify-between gap-2">
        {Array.from({ length: OTP_LENGTH }, (_, i) => {
          const char = value[i] ?? '';
          const active = i === Math.min(value.length, OTP_LENGTH - 1);
          return (
            <View
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed number of boxes
              key={i}
              className={`h-16 flex-1 items-center justify-center rounded-md border-2 bg-surface ${
                error
                  ? 'border-danger'
                  : active
                    ? 'border-brand'
                    : char
                      ? 'border-text-primary'
                      : 'border-border'
              }`}
            >
              <Text variant="title" style={{ fontVariant: ['tabular-nums'] }}>
                {char}
              </Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, OTP_LENGTH))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        maxLength={OTP_LENGTH}
        accessibilityLabel={label}
        caretHidden
        style={{ position: 'absolute', opacity: 0.011, width: '100%', height: '100%' }}
      />
    </Pressable>
  );
}
