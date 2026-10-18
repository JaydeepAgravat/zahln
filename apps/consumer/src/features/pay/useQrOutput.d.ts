import type { CameraOutput } from 'react-native-vision-camera';

/** Platform-specific QR camera output: see useQrOutput.ios.ts and useQrOutput.android.ts. */
export declare function useQrOutput(onCodes: (values: string[]) => void): CameraOutput;
