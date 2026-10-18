import { describe, expect, it } from 'vitest';
import { applyKeypadKey, formatMoney, includedVat, type KeypadKey, sumCents } from '../src/money';

const type = (keys: KeypadKey[], start = 0) => keys.reduce((cents, key) => applyKeypadKey(cents, key), start);

describe('formatMoney', () => {
  it('formats German style with the euro sign after the amount', () => {
    expect(formatMoney(630, 'de')).toBe('6,30 €');
    expect(formatMoney(123456, 'de')).toBe('1.234,56 €');
  });

  it('formats English style with the euro sign first', () => {
    expect(formatMoney(630, 'en')).toBe('€6.30');
  });

  it('rejects floats', () => {
    expect(() => formatMoney(6.3)).toThrow(TypeError);
  });
});

describe('applyKeypadKey (cents-first)', () => {
  it('builds 6,30 € from 6, 3, 0', () => {
    expect(type(['6'])).toBe(6);
    expect(type(['6', '3'])).toBe(63);
    expect(type(['6', '3', '0'])).toBe(630);
  });

  it('supports 00, backspace and clear', () => {
    expect(type(['5', '00'])).toBe(500);
    expect(type(['6', '3', '0', 'backspace'])).toBe(63);
    expect(type(['6', '3', 'clear'])).toBe(0);
  });

  it('ignores input beyond the maximum', () => {
    expect(applyKeypadKey(99_999, '9', 99_999)).toBe(99_999);
  });
});

describe('includedVat', () => {
  it('extracts VAT from gross amounts', () => {
    expect(includedVat(630, 19)).toBe(101);
    expect(includedVat(380, 7)).toBe(25);
    expect(includedVat(630, 0)).toBe(0);
  });
});

describe('sumCents', () => {
  it('adds integer cents and refuses floats', () => {
    expect(sumCents([380, 250])).toBe(630);
    expect(() => sumCents([0.1, 0.2])).toThrow(TypeError);
  });
});

describe('spokenMoney', () => {
  it('gives screen readers a natural label', async () => {
    const { spokenMoney } = await import('../src/money');
    expect(spokenMoney(630, 'de')).toBe('6 Euro 30 Cent');
    expect(spokenMoney(500, 'de')).toBe('5 Euro');
    expect(spokenMoney(101, 'en')).toBe('1 euro 1 cent');
    expect(spokenMoney(-630, 'en')).toBe('minus 6 euros 30 cents');
  });
});
