import type { IntentStatus, PaymentIntent, Plan } from '@zahln/shared';

export type Session = {
  user: { id: string; name: string; phone: string };
  merchant: { id: string; name: string; handle: string; city: string; plan: Plan } | null;
  role: 'owner' | 'manager' | 'staff' | null;
  stepUpUntil: string;
};

export type Summary = {
  today: { cents: number; count: number; refundedCents: number; tipCents: number };
  byHour: number[];
  week: { day: string; cents: number; count: number }[];
  byStaff: { name: string; cents: number; count: number }[];
  live: boolean;
};

export type Tx = PaymentIntent & { staffName: string; payerName: string | null; tipCents: number };
export type TxPage = { items: Tx[]; nextCursor: string | null };
export type TxFilters = { q?: string; status?: IntentStatus; from?: string; to?: string };

export type Receipt = {
  intent: PaymentIntent;
  staffName: string | null;
  payerName: string | null;
  tipCents: number;
  refunds: { id: string; amountCents: number; reason: string; by: string; createdAt: string }[];
};

export type Payouts = {
  balanceCents: number;
  automatic: boolean;
  nextSettlementAt: string;
  history: { id: string; amountCents: number; createdAt: string }[];
};

export type Team = {
  members: {
    userId: string;
    name: string;
    phone: string;
    role: 'owner' | 'manager' | 'staff';
    since: string;
  }[];
  limit: number | null;
  canManage: boolean;
};
