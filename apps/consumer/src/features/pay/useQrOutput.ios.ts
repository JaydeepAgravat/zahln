import { useCallback, useMemo } from 'react';
import {
  type CameraOutput,
  isScannedCode,
  type ScannedObject,
  type ScannedObjectType,
  useObjectOutput,
} from 'react-native-vision-camera';

const TYPES: ScannedObjectType[] = ['qr'];

/**
 * iOS: AVFoundation's built-in QR detector via VisionCamera's object output. No ML Kit on iOS:
 * it adds ~20 MB, and Google ships no arm64 simulator slices, which would break simulator builds.
 */
export function useQrOutput(onCodes: (values: string[]) => void): CameraOutput {
  const onObjectsScanned = useCallback(
    (objects: ScannedObject[]) => {
      const values = objects.filter(isScannedCode).flatMap((code) => (code.value ? [code.value] : []));
      if (values.length) onCodes(values);
    },
    [onCodes],
  );
  const types = useMemo(() => TYPES, []);
  return useObjectOutput({ types, onObjectsScanned });
}
