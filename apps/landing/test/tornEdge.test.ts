import { describe, expect, it } from 'vitest';
import { mulberry32, tornEdge, tornEdgeMask, tornEdgePoints, valueNoise1D } from '../lib/tornEdge';

const numbers = (d: string) => (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
const pairs = (d: string) => {
  const n = numbers(d);
  return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i] as number, n[2 * i + 1] as number]);
};

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});

describe('valueNoise1D', () => {
  it('is continuous: neighbouring samples are close', () => {
    const n = valueNoise1D(7);
    for (let x = 0; x < 20; x += 0.01) expect(Math.abs(n(x + 0.001) - n(x))).toBeLessThan(0.01);
  });
});

describe('tornEdge', () => {
  it('gives the same path for the same seed (server and client agree)', () => {
    expect(tornEdge(3, 1200, 24)).toBe(tornEdge(3, 1200, 24));
    expect(tornEdgeMask(3, 1200, 24)).toBe(tornEdgeMask(3, 1200, 24));
  });

  it('gives different paths for different seeds', () => {
    expect(tornEdge(3, 1200, 24)).not.toBe(tornEdge(4, 1200, 24));
  });

  it('is a closed path that starts and ends on the paper side', () => {
    const d = tornEdge(11, 1200, 24);
    expect(d.startsWith('M0 24')).toBe(true);
    expect(d.endsWith('L1200 24Z')).toBe(true);
    const top = tornEdge(11, 1200, 24, { paper: 'top' });
    expect(top.startsWith('M0 0')).toBe(true);
    expect(top.endsWith('L1200 0Z')).toBe(true);
  });

  it('keeps every point inside the viewBox', () => {
    for (const seed of [1, 2, 3, 99, 2026]) {
      for (const [w, h] of [
        [1200, 24],
        [375, 10],
      ] as const) {
        for (const paper of ['bottom', 'top'] as const) {
          for (const [x, y] of pairs(tornEdge(seed, w, h, { paper }))) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(w);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(h);
          }
        }
      }
    }
  });

  it('walks strictly left to right and covers the full width', () => {
    const pts = tornEdgePoints(5, 1200, 24);
    for (let i = 1; i < pts.length; i++) expect(pts[i]?.[0]).toBeGreaterThan(pts[i - 1]?.[0] ?? -1);
    expect(pts[0]?.[0]).toBe(0);
    expect(pts.at(-1)?.[0]).toBe(1200);
  });

  it('actually looks torn: uses most of the amplitude with many teeth', () => {
    const pts = tornEdgePoints(8, 1200, 24);
    const ys = pts.map(([, y]) => y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(10);
    expect(pts.length).toBeGreaterThan(100);
  });

  it('rejects nonsense sizes', () => {
    expect(() => tornEdge(1, 0, 10)).toThrow(RangeError);
    expect(() => tornEdge(1, 100, -1)).toThrow(RangeError);
  });
});
