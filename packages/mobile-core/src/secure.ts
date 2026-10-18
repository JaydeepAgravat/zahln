import { pinCooldownMs } from '@zahln/shared';
import * as Keychain from 'react-native-keychain';

/**
 * Everything secret lives in the iOS Keychain / Android Keystore, never in MMKV or AsyncStorage.
 * All items are `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: not readable while the phone is locked,
 * and never included in iCloud or device backups (so a restored backup can't clone a session).
 */
const SERVICE = {
  session: 'de.zahln.session',
  device: 'de.zahln.device',
  pin: 'de.zahln.pin',
  pinAttempts: 'de.zahln.pin-attempts',
  biometric: 'de.zahln.biometric-unlock',
} as const;

const base = { accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY } as const;

async function read(service: string): Promise<string | null> {
  const item = await Keychain.getGenericPassword({ service });
  return item ? item.password : null;
}

async function write(service: string, value: string) {
  await Keychain.setGenericPassword('zahln', value, { ...base, service });
}

// ---------- Device ID (device binding) ----------

/** A random ID that identifies this install to the API. Created once, never leaves this device's keychain. */
export async function getOrCreateDeviceId(createId: () => string): Promise<string> {
  const existing = await read(SERVICE.device);
  if (existing) return existing;
  const id = createId();
  await write(SERVICE.device, id);
  return id;
}

// ---------- Session ----------

export type StoredSession = { token: string; userId: string };

export async function saveSession(session: StoredSession) {
  await write(SERVICE.session, JSON.stringify(session));
}

/** Only called after the app-level unlock (PIN or biometrics) has succeeded. */
export async function readSession(): Promise<StoredSession | null> {
  const raw = await read(SERVICE.session);
  return raw ? (JSON.parse(raw) as StoredSession) : null;
}

// ---------- PIN ----------
// MVP: the PIN is kept in the keychain and compared on device, with an attempt counter that is also
// in the keychain (so clearing app data doesn't reset it). Production: verify the PIN on the server
// (rate-limited per device) so a jailbroken phone can't brute-force it offline. See DAY-2.md.

export async function savePin(pin: string) {
  await write(SERVICE.pin, pin);
  await write(SERVICE.pinAttempts, JSON.stringify({ failed: 0, lastFailedAt: 0 }));
}

type Attempts = { failed: number; lastFailedAt: number };

async function readAttempts(): Promise<Attempts> {
  const raw = await read(SERVICE.pinAttempts);
  return raw ? (JSON.parse(raw) as Attempts) : { failed: 0, lastFailedAt: 0 };
}

/** Milliseconds until the next PIN attempt is allowed (0 = now). */
export async function pinLockedForMs(now = Date.now()): Promise<number> {
  const attempts = await readAttempts();
  const cooldown = pinCooldownMs(attempts.failed);
  return Math.max(0, attempts.lastFailedAt + cooldown - now);
}

export type PinCheck = { ok: true } | { ok: false; failed: number; lockedForMs: number };

export async function checkPin(pin: string, now = Date.now()): Promise<PinCheck> {
  const lockedForMs = await pinLockedForMs(now);
  const attempts = await readAttempts();
  if (lockedForMs > 0) return { ok: false, failed: attempts.failed, lockedForMs };

  if (pin === (await read(SERVICE.pin))) {
    await write(SERVICE.pinAttempts, JSON.stringify({ failed: 0, lastFailedAt: 0 }));
    return { ok: true };
  }
  const failed = attempts.failed + 1;
  await write(SERVICE.pinAttempts, JSON.stringify({ failed, lastFailedAt: now }));
  return { ok: false, failed, lockedForMs: pinCooldownMs(failed) };
}

// ---------- Biometrics ----------

export async function biometryType(): Promise<Keychain.BIOMETRY_TYPE | null> {
  return Keychain.getSupportedBiometryType();
}

/**
 * Store a random secret behind `BIOMETRY_CURRENT_SET`: the OS only releases it after Face ID / fingerprint,
 * and enrolling a new face or finger invalidates it, so someone can't add their own biometrics and unlock.
 */
export async function enableBiometricUnlock(secret: string): Promise<boolean> {
  const result = await Keychain.setGenericPassword('zahln', secret, {
    ...base,
    service: SERVICE.biometric,
    accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
    securityLevel: Keychain.SECURITY_LEVEL.SECURE_HARDWARE,
  });
  return result !== false;
}

export type BiometricUnlock = 'ok' | 'cancelled' | 'unavailable';

/** Prompts Face ID / fingerprint. Succeeds only if the OS releases the protected secret. */
export async function unlockWithBiometrics(prompt: {
  title: string;
  cancel: string;
}): Promise<BiometricUnlock> {
  try {
    const item = await Keychain.getGenericPassword({
      service: SERVICE.biometric,
      accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_CURRENT_SET,
      authenticationPrompt: prompt,
    });
    return item ? 'ok' : 'unavailable';
  } catch {
    // User cancelled, too many failures, or the item was invalidated by a biometric enrolment change.
    return 'cancelled';
  }
}

// ---------- Sign out ----------

export async function clearAll() {
  await Promise.all(
    [SERVICE.session, SERVICE.pin, SERVICE.pinAttempts, SERVICE.biometric].map((service) =>
      Keychain.resetGenericPassword({ service }),
    ),
  );
}
