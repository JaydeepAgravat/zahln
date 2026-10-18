import { TextInput, type TextInputProps, View } from 'react-native';
import { Text } from './Text';
import { useTheme } from './theme';

type Props = TextInputProps & { label: string; error?: string | undefined; hint?: string };

/** React 19: `ref` is a normal prop, so no forwardRef. */
export function TextField({ label, error, hint, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View className="gap-1">
      <Text variant="callout" tone="secondary">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        placeholderTextColor={colors.textTertiary}
        className={`min-h-[52px] rounded-sm border bg-surface px-4 text-text-primary ${
          error ? 'border-danger' : 'border-border-strong'
        }`}
        style={{ fontFamily: 'Inter-Regular', fontSize: 17 }}
        {...rest}
      />
      {error ? (
        <Text variant="footnote" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" tone="tertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
