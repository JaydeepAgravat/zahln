import { haptic } from '@zahln/mobile-core';
import { motion } from '@zahln/shared/tokens';
import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const SPRING = { damping: 18, stiffness: 420, mass: 0.6 };

type Props = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  /** How far it shrinks while pressed (0.97 for big surfaces, 0.92 for keys). */
  scaleTo?: number;
  hapticOnPress?: boolean;
};

/**
 * Every tappable surface in the app: a spring scale on press (runs on the UI thread via Reanimated)
 * plus an optional light haptic. One primitive, so the whole app "feels" the same.
 */
export function PressableScale({
  children,
  className,
  style,
  scaleTo = 0.97,
  hapticOnPress = false,
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      disabled={disabled}
      className={className}
      style={[animated, style]}
      onPressIn={(e) => {
        scale.value = withSpring(scaleTo, SPRING);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, SPRING);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        onPress?.(e);
        if (hapticOnPress) haptic.tap();
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

export const PRESS_DURATION = motion.duration.fast;
