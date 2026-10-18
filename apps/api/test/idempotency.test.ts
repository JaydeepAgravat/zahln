import { describe, expect, it } from 'vitest';
import { canonicalJson, requestHash } from '../src/lib/idempotency';

describe('request hashing', () => {
  it('ignores key order', () => {
    expect(canonicalJson({ b: 1, a: { d: 2, c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
    expect(requestHash('POST /x', { a: 1, b: 2 })).toBe(requestHash('POST /x', { b: 2, a: 1 }));
  });

  it('differs by route and body', () => {
    expect(requestHash('POST /x', { a: 1 })).not.toBe(requestHash('POST /y', { a: 1 }));
    expect(requestHash('POST /x', { a: 1 })).not.toBe(requestHash('POST /x', { a: 2 }));
  });

  it('treats undefined fields as absent', () => {
    expect(canonicalJson({ a: 1, b: undefined })).toBe(canonicalJson({ a: 1 }));
  });
});
