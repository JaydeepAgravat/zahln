import type { PendingPayment } from '@zaster/mobile-core';
import type { PaymentAttempt } from '@zaster/shared';

export type TabParamList = { Wallet: undefined; Settings: undefined };

/** Signed-in Zaster: tabs, plus the pay flow and history on top of them. */
export type HomeStackParamList = {
  Tabs: undefined;
  Scan: undefined;
  /** A scanned one-time QR, or a payment to resume after the app was killed mid-flight. */
  Pay: { ref: string } | { resume: PendingPayment };
  /** A merchant's static QR: the payer types the amount. */
  Handle: { handle: string };
  Receipt: { intentId: string; attempt?: PaymentAttempt };
  History: undefined;
};
