import 'react-native-get-random-values';

/** Provided at runtime by react-native-get-random-values (backed by SecRandomCopyBytes / SecureRandom). */
declare const crypto: { getRandomValues<T extends Uint8Array>(array: T): T };

/** RFC 4122 v4 UUID from the platform's secure random generator (never Math.random). */
export function uuid(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
  b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function randomSecret(bytes = 32): string {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}
