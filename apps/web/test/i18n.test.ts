import { describe, expect, it } from 'vitest';
import { berlinDate, money, time } from '../lib/format';
import { messages, translator } from '../lib/i18n-messages';

const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('dashboard copy', () => {
  it('English has every German key, with the same placeholders', () => {
    for (const [key, de] of Object.entries(messages.de)) {
      const en = messages.en[key as keyof typeof messages.en];
      expect(en, key).toBeTruthy();
      expect(vars(en), key).toEqual(vars(de));
    }
  });

  it('fills placeholders', () => {
    expect(translator('de')('today.payments', { count: 3 })).toBe('3 Zahlungen');
  });
});

describe('formatting (same on server and client, so hydration agrees)', () => {
  it('amounts are German by default', () => {
    expect(money(630)).toMatch(/^6,30\s€$/);
  });

  it('times are Berlin time whatever the machine is set to', () => {
    // 22:30 UTC on 18 Oct is 00:30 on 19 Oct in Berlin (summer time).
    expect(time('2026-10-18T22:30:00Z', 'de')).toBe('00:30');
    expect(berlinDate(new Date('2026-10-18T22:30:00Z'))).toBe('2026-10-19');
  });
});
