import { View } from 'react-native';
import { haptic } from '../lib/haptics';
import { useT } from '../lib/i18n';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
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
  biometricIcon?: IconName | null;
  disabled?: boolean;
};

const ROWS: KeypadKey[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
];

/**
 * 3×4 keypad shared by the till amount entry and the PIN. Keys ≥ 64 pt, spring press, haptic tick.
 * Digits sit on the paper itself (no key boxes) so the screen stays calm; the press scale gives feedback.
 */
export function Keypad({ onKey, mode, biometricIcon, disabled }: Props) {
  const { t } = useT();
  const leftKey: KeypadKey | null = mode === 'amount' ? '00' : biometricIcon ? 'biometric' : null;
  const rows: (KeypadKey | null)[][] = [...ROWS, [leftKey, '0', 'backspace']];

  return (
    <View className="gap-2">
      {rows.map((row, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed 4-row grid, never reordered
        <View key={i} className="flex-row gap-2">
          {row.map((key, j) =>
            key === null ? (
              // biome-ignore lint/suspicious/noArrayIndexKey: the empty cell's position is its identity
              <View key={`empty-${j}`} className="min-h-[68px] flex-1" />
            ) : (
              <PressableScale
                key={key}
                disabled={disabled}
                scaleTo={0.88}
                onPress={() => {
                  haptic.tap();
                  onKey(key);
                }}
                accessibilityRole="button"
                accessibilityLabel={
                  key === 'backspace' ? t('a11y.delete') : key === 'biometric' ? t('a11y.useBiometrics') : key
                }
                className={`min-h-[68px] flex-1 items-center justify-center rounded-xl ${
                  key === 'backspace' || key === 'biometric' ? '' : 'bg-surface'
                } ${disabled ? 'opacity-40' : ''}`}
              >
                {key === 'backspace' ? (
                  <Icon name="backspace" size={28} color="textSecondary" />
                ) : key === 'biometric' && biometricIcon ? (
                  <Icon name={biometricIcon} size={30} color="brandText" />
                ) : (
                  <Text variant="keypadDigit" style={{ fontSize: 30, fontFamily: 'Inter-SemiBold' }}>
                    {key}
                  </Text>
                )}
              </PressableScale>
            ),
          )}
        </View>
      ))}
    </View>
  );
}
