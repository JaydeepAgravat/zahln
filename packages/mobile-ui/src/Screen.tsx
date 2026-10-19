import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  /** Pinned to the bottom (primary actions), above the keyboard. */
  footer?: ReactNode;
  scroll?: boolean;
};

/**
 * RN 0.88 runs Android edge-to-edge, where `adjustResize` no longer shrinks the window, and on iOS
 * KeyboardAvoidingView left the footer button under the number pad. So we pad by the keyboard height
 * ourselves on both (iOS gets the "will" events, so the footer moves with the keyboard).
 */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Safe area + 20 pt gutter + themed background. Every screen starts here. */
export function Screen({ children, footer, scroll = true }: Props) {
  const keyboard = useKeyboardHeight();
  // On iOS the keyboard covers the home-indicator inset too, which SafeAreaView already pads.
  const { bottom } = useSafeAreaInsets();
  const keyboardPadding = Platform.OS === 'ios' ? Math.max(0, keyboard - bottom) : keyboard;
  const body = <View className="flex-1 gap-6 px-5 pb-6 pt-4">{children}</View>;
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <View className="flex-1" style={{ paddingBottom: keyboardPadding }}>
        {scroll ? (
          <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? <View className="gap-3 px-5 pb-4">{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}
