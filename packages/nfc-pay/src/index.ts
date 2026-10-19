import { useEffect } from 'react';
import { Platform } from 'react-native';
import NativeNfcPay from './NativeNfcPay';

/**
 * Phone-to-phone NFC. Android only: on iOS a third-party app can read tags (Core NFC) but card emulation
 * needs Apple's EEA HCE entitlement (iOS 17.4+, an agreement and a review), and Tap to Pay on iPhone is for
 * cards through approved PSPs, not our account-to-account references. See docs/HANDBOOK.md §3.14.
 */
export const nfcPay = {
  supported: Platform.OS === 'android' && (NativeNfcPay?.isSupported() ?? false),
  enabled: () => NativeNfcPay?.isEnabled() ?? false,
  /** Till: hold out the open payment until stopped. */
  offer(ref: string) {
    NativeNfcPay?.startEmulating(ref);
    return () => NativeNfcPay?.stopEmulating();
  },
};

/** Payer: while mounted (and `active`), any till tapped against the phone delivers its reference. */
export function useNfcReader(active: boolean, onRef: (ref: string) => void) {
  useEffect(() => {
    if (!active || !NativeNfcPay || !nfcPay.supported) return;
    NativeNfcPay.startReading();
    const read = NativeNfcPay.onTagRead(onRef);
    return () => {
      read.remove();
      NativeNfcPay?.stopReading();
    };
  }, [active, onRef]);
}
