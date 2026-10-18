/** "+4915100000010" → "+49 151 0000 0010" (display only; E.164 stays the stored form). */
export const prettyPhone = (e164: string) => e164.replace(/^\+49(\d{3})(\d{4})(\d+)$/, '+49 $1 $2 $3');
