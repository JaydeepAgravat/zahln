import { useEffect, useState } from 'react';
import { BIOMETRY_TYPE } from 'react-native-keychain';
import { biometryType } from './secure';

export type BiometryInfo = { available: boolean; label: string; icon: 'faceId' | 'fingerprint' | null };

const describe = (type: BIOMETRY_TYPE | null): BiometryInfo => {
  switch (type) {
    case BIOMETRY_TYPE.FACE_ID:
      return { available: true, label: 'Face ID', icon: 'faceId' };
    case BIOMETRY_TYPE.TOUCH_ID:
      return { available: true, label: 'Touch ID', icon: 'fingerprint' };
    case null:
      return { available: false, label: 'Biometrie', icon: null };
    default:
      return { available: true, label: 'Fingerabdruck', icon: 'fingerprint' };
  }
};

let probe: Promise<BiometryInfo> | null = null;
let known: BiometryInfo | null = null;

/**
 * Ask the OS once and cache the answer. The keychain probe can take seconds on a cold simulator,
 * so the app shell starts it at boot and the biometrics screens never wait on a blank frame.
 */
export function prefetchBiometry(): Promise<BiometryInfo> {
  probe ??= biometryType()
    .then(describe)
    .catch(() => describe(null))
    .then((info) => {
      known = info;
      return info;
    });
  return probe;
}

export function useBiometry(): BiometryInfo | null {
  const [info, setInfo] = useState<BiometryInfo | null>(known);
  useEffect(() => {
    if (known) return;
    let alive = true;
    void prefetchBiometry().then((next) => alive && setInfo(next));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}
