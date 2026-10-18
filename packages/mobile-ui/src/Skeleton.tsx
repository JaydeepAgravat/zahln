import { useEffect } from 'react';
import { type DimensionValue, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/** A calm pulse instead of a spinner: the layout is already where the content will be. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius = 8,
  className,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  className?: string;
}) {
  const opacity = useSharedValue(0.55);
  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad), reduceMotion: ReduceMotion.System }),
      -1,
      true,
    );
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Animated.View
        className={`bg-surface-muted ${className ?? ''}`}
        style={[{ width, height, borderRadius: radius }, style]}
      />
    </View>
  );
}
