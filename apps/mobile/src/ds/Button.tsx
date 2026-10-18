import { ActivityIndicator, Pressable, type PressableProps, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'pay';

const container: Record<ButtonVariant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-brand-subtle',
  tertiary: 'bg-transparent',
  destructive: 'bg-danger',
  pay: 'bg-brand',
};

const label: Record<ButtonVariant, 'on-brand' | 'brand' | 'on-flood'> = {
  primary: 'on-brand',
  secondary: 'brand',
  tertiary: 'brand',
  destructive: 'on-flood',
  pay: 'on-brand',
};

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  /** Leading glyph, e.g. a Face ID symbol on the pay button. */
  icon?: string;
};

/** Full-radius buttons, 56 pt for pay / 48 pt otherwise (≥ 48 pt touch target). */
export function Button({ title, variant = 'primary', loading = false, disabled, icon, ...rest }: Props) {
  const { colors } = useTheme();
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!inactive, busy: loading }}
      disabled={inactive}
      className={`flex-row items-center justify-center rounded-full px-6 ${container[variant]} ${
        variant === 'pay' ? 'min-h-[56px]' : 'min-h-[48px]'
      } ${inactive ? 'opacity-50' : ''}`}
      style={({ pressed }) => ({ opacity: pressed && !inactive ? 0.85 : undefined })}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'tertiary' ? colors.brand : colors.onBrand}
        />
      ) : (
        <View className="flex-row items-center gap-2">
          {icon ? (
            <Text variant="headline" tone={label[variant]} importantForAccessibility="no">
              {icon}
            </Text>
          ) : null}
          <Text variant="headline" tone={label[variant]} className="text-center">
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
