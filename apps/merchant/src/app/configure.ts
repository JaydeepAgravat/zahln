import { configureApp, setApiUrl } from '@zahln/mobile-core';
import { PermissionsAndroid, Platform } from 'react-native';
import pkg from '../../package.json';
import { API_URL_OVERRIDE } from './env.gen';

// Runs before anything else in index.js: every shared package reads the app kind and version from here.
configureApp('merchant', pkg.version);

// A LAN demo build talks to the API on the dev machine over Wi-Fi.
if (API_URL_OVERRIDE) {
  setApiUrl(API_URL_OVERRIDE);
  // Android 16+ asks before an app may reach devices on the local network ("Nearby devices").
  if (Platform.OS === 'android' && Number(Platform.Version) >= 36) {
    void PermissionsAndroid.request('android.permission.ACCESS_LOCAL_NETWORK' as never).catch(() => {});
  }
}
