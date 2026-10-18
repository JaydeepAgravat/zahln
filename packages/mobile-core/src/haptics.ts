import { trigger } from 'react-native-haptic-feedback';

const options = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

/** Haptics are a nicety: a missing or failing haptics engine must never block the action itself. */
function safe(type: Parameters<typeof trigger>[0]) {
  return () => {
    try {
      trigger(type, options);
    } catch {
      // ignore: no haptics on this device / simulator
    }
  };
}

/**
 * Haptics carry meaning, so they map to outcomes, not to "every tap":
 * tap = a key or button press, success = money moved / step done, warning = attention, error = refused.
 * Respects the system haptics setting on Android.
 */
export const haptic = {
  tap: safe('impactLight'),
  select: safe('selection'),
  success: safe('notificationSuccess'),
  warning: safe('notificationWarning'),
  error: safe('notificationError'),
};
