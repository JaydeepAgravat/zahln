import { describe, expect, it } from 'vitest';
import { requiredAuth } from '../src/reauth';
import { scrub, scrubString } from '../src/scrub';

describe('log scrubber', () => {
  it('masks an IBAN, a JWT, a bearer token and a phone number inside free text', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfbGVuYSJ9.dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const line = `pay failed for DE89 3704 0044 0532 0130 00 with ${jwt}; Authorization: Bearer abcdefgh12345678; call +4915100000001`;
    const out = scrubString(line);
    expect(out).not.toContain('3704');
    expect(out).not.toContain('eyJhbGci');
    expect(out).not.toContain('abcdefgh12345678');
    expect(out).not.toContain('15100000001');
    expect(out).toContain('[iban]');
    expect(out).toContain('[jwt]');
    expect(out).toContain('[phone]');
  });

  it('redacts sensitive keys at any depth, whatever the value', () => {
    const out = scrub({
      user: { id: 'usr_lena', phone: '+4915100000001', wallet: { balanceCents: 2847 } },
      headers: { authorization: 'Bearer x', 'x-csrf-token': 'y' },
      attempt: { amountCents: 630, status: 'paid' },
      pin: '271828',
    });
    expect(out).toEqual({
      user: { id: 'usr_lena', phone: '[redacted]', wallet: { balanceCents: '[redacted]' } },
      headers: { authorization: '[redacted]', 'x-csrf-token': '[redacted]' },
      attempt: { amountCents: '[redacted]', status: 'paid' },
      pin: '[redacted]',
    });
  });

  it('keeps errors useful but clean, and survives cycles', () => {
    const err = new Error('timeout talking to DE89370400440532013000');
    const loop: Record<string, unknown> = { name: 'a' };
    loop.self = loop;
    expect(scrub(err)).toMatchObject({ name: 'Error', message: 'timeout talking to [iban]' });
    expect(scrub(loop)).toEqual({ name: 'a', self: '[circular]' });
  });

  it('leaves ordinary text alone', () => {
    expect(scrubString('Café Mila, receipt 42, status paid')).toBe('Café Mila, receipt 42, status paid');
  });
});

describe('re-auth rules', () => {
  const limits = { reauthAboveCents: 5000 };
  it('small payments accept biometrics; above the threshold the PIN is required', () => {
    expect(requiredAuth('payment', { amountCents: 630, ...limits })).toBe('biometric_or_pin');
    expect(requiredAuth('payment', { amountCents: 5000, ...limits })).toBe('biometric_or_pin');
    expect(requiredAuth('payment', { amountCents: 5001, ...limits })).toBe('pin');
  });
  it('refunds, PIN change, data export and device sign-out always need the PIN', () => {
    for (const action of ['refund', 'pin_change', 'data_export', 'device_revoke'] as const)
      expect(requiredAuth(action, limits)).toBe('pin');
  });
});
