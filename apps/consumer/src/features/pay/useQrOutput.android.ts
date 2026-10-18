import { useCallback } from 'react';
import type { CameraOutput } from 'react-native-vision-camera';
import { type Barcode, useBarcodeScannerOutput } from 'react-native-vision-camera-barcode-scanner';

/** Android: Google ML Kit barcode scanning (VisionCamera's built-in code scanner is iOS-only in v5). */
export function useQrOutput(onCodes: (values: string[]) => void): CameraOutput {
  const onBarcodeScanned = useCallback(
    (barcodes: Barcode[]) => {
      const values = barcodes.flatMap((b) => (b.rawValue ? [b.rawValue] : []));
      if (values.length) onCodes(values);
    },
    [onCodes],
  );
  return useBarcodeScannerOutput({ barcodeFormats: ['qr-code'], onBarcodeScanned, onError: () => undefined });
}
