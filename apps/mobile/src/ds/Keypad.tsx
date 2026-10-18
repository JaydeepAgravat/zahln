import { Pressable, View } from 'react-native';
import { useT } from '../lib/i18n';
import { Text } from './Text';

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '00'
  | 'backspace'
  | 'biometric';

type Props = {
  onKey: (key: KeypadKey) => void;
  /** `amount`: bottom-left is "00". `pin`: bottom-left is the biometric key (if available) or empty. */
  mode: 'amount' | 'pin';
  biometricGlyph?: string | null;
  disabled?: boolean;
};

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/** 3×4 grid with keys ≥ 64 pt, shared by the till amount entry and the PIN. */
export function Keypad({ onKey, mode, biometricGlyph, disabled }: Props) {
  const { t } = useT();
  const leftKey: KeypadKey | null = mode === 'amount' ? '00' : biometricGlyph ? 'biometric' : null;
  const rows: (KeypadKey | null)[][] = [...ROWS, [leftKey, '0', 'backspace']];

  return (
    <View className="gap-3" accessibilityRole="keyboardkey">
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-row grid, never reordered
        <View key={i} className="flex-row gap-3">
          {row.map((key, j) =>
            key === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: the empty cell's position is its identity
              <View key={`empty-${j}`} className="min-h-[64px] flex-1" />
            ) : (
              <Pressable
                key={key}
                disabled={disabled}
                onPress={() => onKey(key)}
                accessibilityRole="button"
                accessibilityLabel={
                  key === 'backspace' ? t('a11y.delete') : key === 'biometric' ? t('a11y.useBiometrics') : key
                }
                className="min-h-[64px] flex-1 items-center justify-center rounded-lg bg-surface-raised"
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : disabled ? 0.4 : 1 })}
              >
                <Text variant="keypadDigit">
                  {key === 'backspace' ? '⌫' : key === 'biometric' ? (biometricGlyph ?? '') : key}
                </Text>
              </Pressable>
            ),
          )}
        </View>
      ))}
    </View>
  );
}
