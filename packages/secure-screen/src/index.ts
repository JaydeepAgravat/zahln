import { useEffect, useState } from 'react';
import NativeSecureScreen from './NativeSecureScreen';

export type Integrity = { rooted: boolean; emulator: boolean; signals: string[] };

/**
 * Protect a sensitive screen (PIN, wallet, receipt, refund) while it's mounted:
 * - Android: FLAG_SECURE, so no screenshots, no recordings, and a blank recents thumbnail.
 * - iOS: there is no public screenshot block. The app-switcher snapshot is blurred, and `captured` turns true
 *   while the screen is recorded or mirrored, so the screen can hide the balance.
 */
export function useSecureScreen(active = true): { captured: boolean } {
  const [captured, setCaptured] = useState(() => NativeSecureScreen?.isCaptured() ?? false);
  useEffect(() => {
    if (!active || !NativeSecureScreen) return;
    NativeSecureScreen.enable();
    setCaptured(NativeSecureScreen.isCaptured());
    const sub = NativeSecureScreen.onCaptureChanged((value) => setCaptured(value));
    return () => {
      sub.remove();
      NativeSecureScreen?.disable();
    };
  }, [active]);
  return { captured };
}

/** Called when the user takes a screenshot on iOS (it can't be prevented, only noticed). */
export function onScreenshot(listener: () => void): () => void {
  if (!NativeSecureScreen) return () => {};
  const sub = NativeSecureScreen.onScreenshot(listener);
  return () => sub.remove();
}

/** Root/jailbreak/emulator hints. `null` where the module isn't available. */
export function deviceIntegrity(): Integrity | null {
  return NativeSecureScreen?.integrity() ?? null;
}
