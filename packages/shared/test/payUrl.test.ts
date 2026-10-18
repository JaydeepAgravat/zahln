import { describe, expect, it } from 'vitest';
import { PAY_URL_BASE, parsePayUrl, payUrlFor } from '../src/payUrl';

const ID = '3f2a9c1e-7b4d-4e8a-9c0b-1d2e3f4a5b6c';
const REF = `${ID}.AbCdEf0123_-xyZ9`;

describe('pay URLs', () => {
  it('round-trips a reference through the QR link', () => {
    expect(payUrlFor(REF)).toBe(`${PAY_URL_BASE}${REF}`);
    expect(parsePayUrl(payUrlFor(REF))).toEqual({ ref: REF, intentId: ID });
  });

  it('accepts the app scheme, a bare reference and stray whitespace or query strings', () => {
    expect(parsePayUrl(`zahln://i/${REF}`)?.intentId).toBe(ID);
    expect(parsePayUrl(`  ${REF}\n`)?.intentId).toBe(ID);
    expect(parsePayUrl(`${PAY_URL_BASE}${REF}?utm=poster`)?.ref).toBe(REF);
  });

  it('rejects anything that is not a signed reference', () => {
    for (const text of [
      '',
      `https://example.com/i/${REF}`,
      `${PAY_URL_BASE}${ID}`, // no signature
      `${PAY_URL_BASE}${ID}.short`,
      `${PAY_URL_BASE}not-a-uuid.AbCdEf0123_-xyZ9`,
      'https://pay.zahln.de/i/../../etc/passwd',
    ]) {
      expect(parsePayUrl(text)).toBeNull();
    }
  });
});
