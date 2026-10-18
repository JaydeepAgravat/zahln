/**
 * What a payment QR code carries: a link to a *reference*, never the amount or the payee.
 *
 *   https://pay.zahln.de/i/<intentId>.<signature>
 *
 * The signature (an HMAC made by the API) stops anyone from guessing intent IDs. The app always
 * re-fetches the intent from the server and shows the server's merchant and amount, so a sticker
 * over the merchant's QR can't silently change who gets paid or how much.
 */
export const PAY_URL_BASE = 'https://pay.zahln.de/i/';
const APP_SCHEME_BASE = 'zahln://i/';

const REF = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.([A-Za-z0-9_-]{16})$/;

export type IntentRef = { ref: string; intentId: string };

export function payUrlFor(ref: string): string {
  return `${PAY_URL_BASE}${ref}`;
}

/** Accepts the https link, the app-scheme link or a bare reference; anything else is `null`. */
export function parsePayUrl(text: string): IntentRef | null {
  const trimmed = text.trim();
  const raw = trimmed.startsWith(PAY_URL_BASE)
    ? trimmed.slice(PAY_URL_BASE.length)
    : trimmed.startsWith(APP_SCHEME_BASE)
      ? trimmed.slice(APP_SCHEME_BASE.length)
      : trimmed;
  const match = REF.exec(raw.split(/[?#]/)[0] ?? '');
  return match?.[1] ? { ref: match[0], intentId: match[1] } : null;
}
