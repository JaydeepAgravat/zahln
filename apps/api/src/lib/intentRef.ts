import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed intent references for QR codes: `<intentId>.<16 chars of base64url HMAC-SHA256>`.
 * 96 bits of MAC is plenty for a code that lives 5 minutes and is re-checked by the server anyway.
 */
let secret = 'dev-only-intent-signing-secret-change-me';

export function configureIntentSigning(next: string) {
  if (next.length < 32) throw new Error('INTENT_SIGNING_SECRET must be at least 32 characters');
  secret = next;
}

const mac = (intentId: string) =>
  createHmac('sha256', secret).update(intentId).digest('base64url').slice(0, 16);

export function signIntentRef(intentId: string): string {
  return `${intentId}.${mac(intentId)}`;
}

/** Returns the intent ID when the signature is valid, otherwise `null` (constant-time compare). */
export function verifyIntentRef(ref: string): string | null {
  const dot = ref.lastIndexOf('.');
  if (dot <= 0) return null;
  const intentId = ref.slice(0, dot);
  const given = Buffer.from(ref.slice(dot + 1));
  const expected = Buffer.from(mac(intentId));
  return given.length === expected.length && timingSafeEqual(given, expected) ? intentId : null;
}
