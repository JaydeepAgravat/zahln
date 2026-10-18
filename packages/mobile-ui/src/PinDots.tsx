import { useT } from '@zahln/mobile-core';
import { PIN_LENGTH } from '@zahln/shared';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function Dot({ filled, error }: { filled: boolean; error: boolean }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (filled) {
      scale.value = withSequence(
        withTiming(1.35, { duration: 80, reduceMotion: ReduceMotion.System }),
        withSpring(1, { damping: 12, stiffness: 300, reduceMotion: ReduceMotion.System }),
      );
    }
  }, [filled, scale]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View
      style={style}
      className={`h-4 w-4 rounded-full border-2 ${
        error
          ? 'border-danger bg-danger'
          : filled
            ? 'border-text-primary bg-text-primary'
            : 'border-border-strong'
      }`}
    />
  );
}

/**
 * Filled dots for entered digits, never the digits. Each dot pops when filled; a wrong PIN shakes the row
 * (the universal "no" gesture) and, with Reduce Motion on, just turns red.
 */
export function PinDots({ length, error = false }: { length: number; error?: boolean }) {
  const { t } = useT();
  const x = useSharedValue(0);
  useEffect(() => {
    if (!error) return;
    const opts = { duration: 55, reduceMotion: ReduceMotion.System };
    x.value = withSequence(
      withTiming(-12, opts),
      withTiming(12, opts),
      withTiming(-8, opts),
      withTiming(8, opts),
      withTiming(0, opts),
    );
  }, [error, x]);
  const shake = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Animated.View
      style={shake}
      className="flex-row justify-center gap-5 py-3"
      accessible
      accessibilityRole="text"
      accessibilityLabel={t('a11y.pinProgress', { count: length, total: PIN_LENGTH })}
    >
      {Array.from({ length: PIN_LENGTH }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed number of dots, never reordered
        <Dot key={i} filled={i < length} error={error} />
      ))}
    </Animated.View>
  );
}

export const PinDotsSpacer = () => <View className="h-6" />;
