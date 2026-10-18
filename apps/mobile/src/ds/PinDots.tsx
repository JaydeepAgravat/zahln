import { PIN_LENGTH } from '@zahln/shared';
import { View } from 'react-native';
import { useT } from '../lib/i18n';

/** Filled dots for entered digits. Never shows the digits themselves. */
export function PinDots({ length, error = false }: { length: number; error?: boolean }) {
  const { t } = useT();
  return (
    <View
      className="flex-row justify-center gap-4 py-2"
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('a11y.pinProgress', { count: length, total: PIN_LENGTH })}
    >
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        <View
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed number of dots, never reordered
          key={i}
          className={`h-4 w-4 rounded-full border-2 ${
            error ? 'border-danger bg-danger' : i < length ? 'border-brand bg-brand' : 'border-border-strong'
          }`}
        />
      ))}
    </View>
  );
}
