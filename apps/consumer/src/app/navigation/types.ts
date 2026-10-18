import type { PaymentAttempt, PaymentIntent } from '@zahln/shared';

export type TabParamList = { Wallet: undefined; Settings: undefined };

/** Signed-in Zahln: tabs, plus the pay flow on top of them. */
export type HomeStackParamList = {
  Tabs: undefined;
  Scan: undefined;
  Pay: { ref: string };
  Receipt: { intent: PaymentIntent; attempt: PaymentAttempt };
};
