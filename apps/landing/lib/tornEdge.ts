/**
 * Torn-receipt edges, generated deterministically.
 *
 * A receipt torn against the printer's serrated blade has two scales of roughness: the regular teeth of
 * the blade, and a slow wander where the paper gave way unevenly. We model both: a seeded 1-D value noise
 * (two octaves) for the wander, plus a sawtooth whose period and depth are jittered by the same PRNG.
 *
 * Everything comes from a seeded PRNG (mulberry32), never Math.random, so the same seed gives the same path
 * on the server and in the browser: no hydration mismatch, and the static HTML already has the final edge.
 */

/** mulberry32: a tiny, fast, well-distributed 32-bit PRNG. Returns floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 1-D value noise: random values on an integer lattice, smoothly (cosine) interpolated. Range [0, 1]. */
export function valueNoise1D(seed: number, latticeSize = 64): (x: number) => number {
  const rand = mulberry32(seed);
  const lattice = Array.from({ length: latticeSize + 1 }, () => rand());
  return (x: number) => {
    const xi = Math.floor(x);
    const t = x - xi;
    const i = ((xi % latticeSize) + latticeSize) % latticeSize;
    const a = lattice[i] ?? 0;
    const b = lattice[i + 1] ?? 0;
    const s = (1 - Math.cos(t * Math.PI)) / 2;
    return a * (1 - s) + b * s;
  };
}

export type TornEdgeOptions = {
  /** Average width of one blade tooth, in viewBox units. Default 14. */
  tooth?: number;
  /** Share of the amplitude used by the teeth (the rest is the slow wander). Default 0.45. */
  toothShare?: number;
  /**
   * Which side is paper. 'bottom' (default): the paper fills everything below the edge, for a sheet whose
   * top is torn. 'top': the paper fills everything above it, for a sheet whose bottom is torn.
   */
  paper?: 'bottom' | 'top';
};

const round = (n: number) => Math.round(n * 10) / 10;

/**
 * Returns the y offset (0…amplitude) of the torn line at a set of x positions from 0 to width.
 * Exported for tests; most callers want `tornEdge`.
 */
export function tornEdgePoints(
  seed: number,
  width: number,
  amplitude: number,
  options: TornEdgeOptions = {},
): Array<[number, number]> {
  if (!(width > 0) || !(amplitude > 0)) throw new RangeError('width and amplitude must be > 0');
  const tooth = options.tooth ?? 14;
  const toothShare = Math.min(Math.max(options.toothShare ?? 0.45, 0), 1);
  const rand = mulberry32(seed ^ 0x9e3779b9);
  const wander = valueNoise1D(seed);
  const fibre = valueNoise1D(seed + 1);
  const wanderAmp = amplitude * (1 - toothShare);
  const toothAmp = amplitude * toothShare;

  const at = (x: number, toothDepth: number) => {
    const slow = wander(x / (width / 6)) * 0.75 + fibre(x / (width / 23)) * 0.25; // two octaves, [0, 1]
    return Math.min(Math.max(slow * wanderAmp + toothDepth, 0), amplitude);
  };

  const points: Array<[number, number]> = [[0, at(0, 0)]];
  let x = 0;
  while (x < width) {
    const period = tooth * (0.7 + rand() * 0.6);
    const depth = toothAmp * (0.55 + rand() * 0.45);
    const peakX = x + period * (0.4 + rand() * 0.2);
    if (peakX >= width - 0.5) {
      // Not enough room for another tooth: finish flat at the right edge.
      points.push([width, at(width, 0)]);
      break;
    }
    const nextX = Math.min(x + period, width);
    points.push([peakX, at(peakX, depth)]);
    points.push([nextX, at(nextX, 0)]);
    x = nextX;
  }
  return points.map(([px, py]) => [round(px), round(py)]);
}

/**
 * A closed SVG path for a torn edge in a `0 0 width height` viewBox, where height = amplitude.
 * Fill it with the paper colour (or use it as a mask) and stretch it with preserveAspectRatio="none".
 */
export function tornEdge(
  seed: number,
  width: number,
  amplitude: number,
  options: TornEdgeOptions = {},
): string {
  const points = tornEdgePoints(seed, width, amplitude, options);
  const line = points.map(([x, y]) => `L${x} ${y}`).join('');
  const h = round(amplitude);
  const w = round(width);
  // Paper below: start bottom-left, walk the tear left→right, close along the bottom.
  // Paper above: mirror vertically so the tear is at the bottom of the shape.
  if ((options.paper ?? 'bottom') === 'bottom') {
    return `M0 ${h}${line}L${w} ${h}Z`;
  }
  const flipped = points.map(([x, y]) => `L${x} ${round(h - y)}`).join('');
  return `M0 0${flipped}L${w} 0Z`;
}

/**
 * The edge as a CSS mask-image data URL (black = visible). Only the characters that must be escaped in a
 * data URL are encoded, which keeps it about 40 % smaller than encodeURIComponent.
 */
export function tornEdgeMask(
  seed: number,
  width: number,
  amplitude: number,
  options: TornEdgeOptions = {},
): string {
  const d = tornEdge(seed, width, amplitude, options);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${amplitude}' preserveAspectRatio='none'><path d='${d}'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/[%#<>]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)}")`;
}
