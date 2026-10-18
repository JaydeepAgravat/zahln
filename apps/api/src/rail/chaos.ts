/**
 * Dev-only failure injection for the demo and tests.
 * - ok:                 settle normally
 * - slow:               settle after a delay
 * - reject:             the rail rejects the transfer
 * - drop_after_settle:  settle and commit, then drop the HTTP response (the worst case on campus wifi)
 * - insufficient:       pretend the payer's balance is too low
 */
export const CHAOS_MODES = ['ok', 'slow', 'reject', 'drop_after_settle', 'insufficient'] as const;
export type ChaosMode = (typeof CHAOS_MODES)[number];

export class Chaos {
  mode: ChaosMode = 'ok';
  /** Delay range for `slow`, in milliseconds. */
  slowMs: [number, number] = [3000, 8000];

  set(mode: ChaosMode) {
    this.mode = mode;
  }
}
