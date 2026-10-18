import { describe, expect, it } from 'vitest';
import { isWeakPin, normalizeGermanPhone, PhoneSchema, pinCooldownMs } from '../src/auth';

describe('isWeakPin', () => {
  it.each(['123456', '654321', '000000', '999999', '234567', '876543', '123123'])('rejects %s', (pin) => {
    expect(isWeakPin(pin)).toBe(true);
  });

  it.each(['12345', '1234567', 'abcdef', '12 456'])('rejects malformed %s', (pin) => {
    expect(isWeakPin(pin)).toBe(true);
  });

  it.each(['482915', '730264', '135792'])('accepts %s', (pin) => {
    expect(isWeakPin(pin)).toBe(false);
  });
});

describe('pinCooldownMs', () => {
  it('allows 5 free attempts, then doubles from 30 s, capped at 1 h', () => {
    expect(pinCooldownMs(4)).toBe(0);
    expect(pinCooldownMs(5)).toBe(30_000);
    expect(pinCooldownMs(6)).toBe(60_000);
    expect(pinCooldownMs(20)).toBe(3_600_000);
  });
});

describe('phone numbers', () => {
  it('normalises what people type into E.164', () => {
    expect(normalizeGermanPhone('0151 0000 0001')).toBe('+4915100000001');
    expect(normalizeGermanPhone('+49 151 00000001')).toBe('+4915100000001');
    expect(normalizeGermanPhone('0049151-00000001')).toBe('+4915100000001');
  });

  it('accepts German mobile numbers only', () => {
    expect(PhoneSchema.safeParse('+4915100000001').success).toBe(true);
    expect(PhoneSchema.safeParse('+4930123456').success).toBe(false);
  });
});
