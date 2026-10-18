/** German mobile numbers in E.164, e.g. +4915112345678. Kept free of zod so small web bundles can use it. */
export const GERMAN_MOBILE = /^\+491\d{9,11}$/;

/** Turn what people type ("0151 1234 5678", "+49 151 …") into E.164. */
export function normalizeGermanPhone(input: string): string {
  const digits = input.replace(/[^\d+]/g, '');
  if (digits.startsWith('+49')) return digits;
  if (digits.startsWith('0049')) return `+${digits.slice(2)}`;
  if (digits.startsWith('0')) return `+49${digits.slice(1)}`;
  return digits;
}
