module.exports = {
  // Inter lives in the shared design system; `npx react-native-asset` links it into the native projects.
  assets: ['../../packages/mobile-ui/assets/fonts'],
  dependencies: {
    // Phone-to-phone NFC is Android only (see docs/HANDBOOK.md §3.14): not linked into the iOS app at all.
    '@zaster/nfc-pay': { platforms: { ios: null } },
    // ML Kit QR scanning is Android-only; iOS uses AVFoundation through VisionCamera (see useQrOutput.ios.ts).
    'react-native-vision-camera-barcode-scanner': { platforms: { ios: null } },
  },
};
