import { type ReactNode, useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  children: ReactNode;
  /** Pinned to the bottom (primary actions), above the keyboard. */
  footer?: ReactNode;
  scroll?: boolean;
};

/**
 * RN 0.88 runs Android edge-to-edge, where `adjustResize` no longer shrinks the window and
 * KeyboardAvoidingView doesn't move content. So on Android we pad by the keyboard height ourselves.
 */
function useAndroidKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/** Safe area + 20 pt gutter + themed background. Every screen starts here. */
export function Screen({ children, footer, scroll = true }: Props) {
  const keyboardHeight = useAndroidKeyboardHeight();
  const body = <View className="flex-1 gap-6 px-5 pb-6 pt-4">{children}</View>;
  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ paddingBottom: keyboardHeight }}
      >
        {scroll ? (
          <ScrollView contentContainerClassName="flex-grow" keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
        {footer ? <View className="gap-3 px-5 pb-4">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
