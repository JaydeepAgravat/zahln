import { TEAR_SEEDS } from '@/lib/tears';

/**
 * A strip of paper with a torn edge. The edge is a CSS mask generated from the deterministic tornEdge path
 * (lib/tornEdge.ts → scripts/tears.mjs → app/tears.gen.css); `variant` picks one of the seeded shapes.
 * `top` sits above a paper section (paper below the tear); `bottom` hangs under it.
 */
export function TornEdge({ variant, side }: { variant: number; side: 'top' | 'bottom' }) {
  const v = ((variant % TEAR_SEEDS.length) + TEAR_SEEDS.length) % TEAR_SEEDS.length;
  return <div aria-hidden="true" className={`tear tear-${side} tear-v${v}`} data-tear={side} />;
}
