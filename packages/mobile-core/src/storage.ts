import { createMMKV } from 'react-native-mmkv';

/**
 * Non-secret preferences only (language, theme, role, onboarding done).
 * Secrets (session token, PIN, device ID) live in the keychain: see secure.ts.
 */
export const storage = createMMKV({ id: 'zaster.prefs' });
