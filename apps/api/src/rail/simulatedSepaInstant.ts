import { randomUUID } from 'node:crypto';
import type { Chaos } from './chaos';
import type { PaymentRail, RailResult, RailTransfer } from './types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** SEPA Instant settles in under 10 seconds by scheme rule; usually well under one. */
export class SimulatedSepaInstantRail implements PaymentRail {
  readonly name = 'simulated-sepa-instant';

  constructor(
    private readonly chaos: Chaos,
    private readonly baseLatencyMs = 120,
  ) {}

  async submit(transfer: RailTransfer): Promise<RailResult> {
    if (this.chaos.mode === 'slow') {
      const [min, max] = this.chaos.slowMs;
      await sleep(min + Math.random() * (max - min));
    } else if (this.baseLatencyMs > 0) {
      await sleep(this.baseLatencyMs);
    }
    if (this.chaos.mode === 'reject') return { state: 'rejected', reason: 'rail_rejected' };
    return {
      state: 'settled',
      railReference: `SIM-${transfer.id.slice(0, 8)}-${randomUUID().slice(0, 4)}`,
      settledAt: new Date(),
    };
  }
}
