/**
 * The log scrubber: nothing that identifies a person or their money leaves the device in a log line or a
 * crash report. One function, used by the app logger now and as Sentry's `beforeSend` later.
 *
 * Two layers: sensitive *keys* are replaced whatever their value, and sensitive *patterns* (IBAN, JWT, bearer
 * tokens, card-like numbers, phone numbers) are masked inside any string.
 */
const SENSITIVE_KEY =
  /^(authorization|cookie|set-cookie|token|sessiontoken|verificationtoken|accesstoken|refreshtoken|password|pin|otp|code|devcode|iban|bic|balance|balancecents|amount|amountcents|phone|x-user-id|x-admin-token|x-csrf-token|idempotency-key)$/i;

const PATTERNS: [RegExp, string][] = [
  // JWT: three base64url segments, the first starting with eyJ ({" in base64).
  [/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/g, '[jwt]'],
  // Bearer tokens in a header value that slipped into a message.
  [/Bearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [token]'],
  // IBAN: country code, check digits, 11-30 alphanumerics, spaces allowed (DE89 3704 0044 0532 0130 00).
  [/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){2,7}(?:\s?[A-Z0-9]{1,4})?\b/g, '[iban]'],
  // Phone numbers in E.164 or German national format (before the card rule, which would also match them).
  [/(?:\+49|0049|\b0)1\d{2}[ /-]?\d{3,4}[ /-]?\d{3,5}\b/g, '[phone]'],
  // Card-like numbers (13-19 digits, spaces/dashes allowed).
  [/\b(?:\d[ -]?){12,18}\d\b/g, '[number]'],
];

export function scrubString(value: string): string {
  return PATTERNS.reduce((s, [re, mask]) => s.replace(re, mask), value);
}

/** Deep-copies `value` with sensitive keys replaced and patterns masked. Handles Errors and cycles. */
export function scrub(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === 'string') return scrubString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[circular]';
  seen.add(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: scrubString(value.message),
      stack: value.stack && scrubString(value.stack),
    };
  }
  if (Array.isArray(value)) return value.map((v) => scrub(v, seen));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, SENSITIVE_KEY.test(k) ? '[redacted]' : scrub(v, seen)]),
  );
}
