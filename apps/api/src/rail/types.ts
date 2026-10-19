/**
 * The seam between Zaster and whoever actually moves the money over SEPA Instant
 * (a PSP or partner bank). Today: a simulator. Later: a Tink / finAPI / bank adapter behind the same interface.
 */
export type RailTransfer = {
  /** Our attempt ID, sent as the end-to-end reference, so the rail can deduplicate too. */
  id: string;
  amountCents: number;
  debtorAccount: string;
  creditorAccount: string;
};

export type RailResult =
  | { state: 'settled'; railReference: string; settledAt: Date }
  | { state: 'rejected'; reason: string };

export interface PaymentRail {
  readonly name: string;
  submit(transfer: RailTransfer): Promise<RailResult>;
}
