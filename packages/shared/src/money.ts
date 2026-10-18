/**
 * Money is always an integer number of minor units (cents) plus a currency.
 * Never use floats for money: 0.1 + 0.2 !== 0.3.
 */
export type Cents = number;

export const CURRENCY = 'EUR' as const;
export type Currency = typeof CURRENCY;

export type AppLocale = 'de' | 'en';

const INTL_LOCALE: Record<AppLocale, string> = { de: 'de-DE', en: 'en-IE' };

export function isCents(value: unknown): value is Cents {
  return typeof value === 'number' && Number.isSafeInteger(value);
}

export function assertCents(value: unknown, label = 'amount'): asserts value is Cents {
  if (!isCents(value))
    throw new TypeError(`${label} must be an integer number of cents, got ${String(value)}`);
}

/** `630` → `"6,30 €"` (de) or `"€6.30"` (en). The only place money becomes a string. */
export function formatMoney(cents: Cents, locale: AppLocale = 'de', currency: Currency = CURRENCY): string {
  assertCents(cents);
  return new Intl.NumberFormat(INTL_LOCALE[locale], { style: 'currency', currency }).format(cents / 100);
}

export type KeypadKey =
  | '0'
  | '1'
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '00'
  | 'backspace'
  | 'clear';

/**
 * Cents-first keypad entry, as on card terminals: typing 6, 3, 0 gives 0,06 → 0,63 → 6,30 €.
 * There is no decimal key, so users can't make comma mistakes. Input beyond `maxCents` is ignored.
 */
export function applyKeypadKey(current: Cents, key: KeypadKey, maxCents: Cents = 999_999): Cents {
  assertCents(current, 'current');
  switch (key) {
    case 'clear':
      return 0;
    case 'backspace':
      return Math.floor(current / 10);
    case '00': {
      const next = current * 100;
      return next > maxCents ? current : next;
    }
    default: {
      const next = current * 10 + Number(key);
      return next > maxCents ? current : next;
    }
  }
}

export type VatRate = 0 | 7 | 19;

/** VAT included in a gross amount, rounded half-up to the cent: 630 @ 19 % → 101. */
export function includedVat(grossCents: Cents, rate: VatRate): Cents {
  assertCents(grossCents);
  return Math.round((grossCents * rate) / (100 + rate));
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((total, value) => {
    assertCents(value);
    return total + value;
  }, 0);
}
