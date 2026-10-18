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

export function useBiometry(): BiometryInfo | null {
  const [info, setInfo] = useState<BiometryInfo | null>(null);
  useEffect(() => {
    let alive = true;
    biometryType()
      .then((type) => alive && setInfo(describe(type)))
      .catch(() => alive && setInfo(describe(null)));
    return () => {
      alive = false;
    };
  }, []);
  return info;
}
