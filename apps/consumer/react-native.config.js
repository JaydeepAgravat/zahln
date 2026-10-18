module.exports = {
  // Inter lives in the shared design system; `npx react-native-asset` links it into the native projects.
  assets: ['../../packages/mobile-ui/assets/fonts'],
  dependencies: {
    // ML Kit QR scanning is Android-only; iOS uses AVFoundation through VisionCamera (see useQrOutput.ios.ts).
    'react-native-vision-camera-barcode-scanner': { platforms: { ios: null } },
  },
};
