import type { PaymentIntent } from '@zahln/shared';

export type TabParamList = { Till: undefined; MerchantWallet: undefined; Settings: undefined };

/** Signed-in ZYSYGY: tabs, plus the QR panel and the paid screen on top of them. */
export type HomeStackParamList = {
  Tabs: undefined;
  Qr: { intent: PaymentIntent };
  Paid: { intent: PaymentIntent };
};
