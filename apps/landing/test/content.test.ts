import { describe, expect, it } from 'vitest';
import { de } from '../content/de';
import { en } from '../content/en';

/** Every path to a leaf, with array indices, e.g. `chapters.3.features.1.label`. */
function shape(value: unknown, path = ''): string[] {
  if (Array.isArray(value)) return value.flatMap((v, i) => shape(v, `${path}.${i}`));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [path];
}

/** Values that must be identical in both languages (anchors, assets, media kinds). */
function invariants(copy: typeof de | typeof en) {
  return copy.chapters.map((c) => ({
    id: c.id,
    numeral: c.numeral,
    features: c.features.map((f) => ({
      id: f.id,
      media: f.media.kind,
      screen: f.media.kind === 'device' ? f.media.screen : null,
      link: f.link?.href ?? null,
      soon: f.soon !== '',
    })),
  }));
}

describe('landing copy', () => {
  it('has exactly the same keys and array lengths in de and en', () => {
    expect(shape(en).sort()).toEqual(shape(de).sort());
  });

  it('keeps ids, anchors, screens and media kinds identical across languages', () => {
    expect(invariants(en)).toEqual(invariants(de));
    expect(en.plans.items.map((p) => p.id)).toEqual(de.plans.items.map((p) => p.id));
  });

  it('has ten chapters with Roman numerals I–X and unique ids', () => {
    expect(de.chapters.map((c) => c.numeral)).toEqual([
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
    ]);
    expect(new Set(de.chapters.map((c) => c.id)).size).toBe(10);
    const featureIds = de.chapters.flatMap((c) => c.features.map((f) => f.id));
    expect(new Set(featureIds).size).toBe(featureIds.length);
  });

  it('has no empty strings except the deliberate `soon` flags', () => {
    for (const copy of [de, en]) {
      const empty = shape(copy).filter((p) => {
        const v = p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], copy);
        return v === '' && !p.endsWith('.soon');
      });
      expect(empty).toEqual([]);
    }
  });

  it('links only to chapters that exist', () => {
    const ids = new Set(de.chapters.map((c) => `#${c.id}`));
    for (const c of de.chapters)
      for (const f of c.features) if (f.link) expect(ids.has(f.link.href)).toBe(true);
  });

  it('uses the plan prices from the brief: Free €0, Pro €29, Business €59', () => {
    expect(de.plans.items.map((p) => p.price)).toEqual(['0 €', '29 €', '59 €']);
    expect(en.plans.items.map((p) => p.price)).toEqual(['€0', '€29', '€59']);
  });
});
