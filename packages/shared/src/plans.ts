/**
 * Merchant plans. Every plan has 0 % transaction fees;
 * plans only unlock features. The API enforces these, the app only hides what's unavailable.
 */
export const PLANS = ['free', 'pro', 'business'] as const;
export type Plan = (typeof PLANS)[number];

export const FEATURES = [
  'static_qr',
  'dynamic_qr',
  'staff_roles',
  'refunds',
  'tips',
  'live_dashboard',
  'shift_reports',
  'catalogue',
  'csv_export',
  'daily_auto_settlement',
] as const;
export type Feature = (typeof FEATURES)[number];

const FREE: readonly Feature[] = ['static_qr'];
const PRO: readonly Feature[] = [
  ...FREE,
  'dynamic_qr',
  'staff_roles',
  'refunds',
  'tips',
  'live_dashboard',
  'shift_reports',
];
const BUSINESS: readonly Feature[] = [...PRO, 'catalogue', 'csv_export', 'daily_auto_settlement'];

export const PLAN_FEATURES: Record<Plan, readonly Feature[]> = { free: FREE, pro: PRO, business: BUSINESS };

export const PLAN_STAFF_LIMIT: Record<Plan, number> = { free: 1, pro: 5, business: Number.POSITIVE_INFINITY };

export function hasFeature(plan: Plan, feature: Feature): boolean {
  return PLAN_FEATURES[plan].includes(feature);
}

/** The cheapest plan that includes a feature, for "upgrade to Pro" messages. */
export function minimumPlanFor(feature: Feature): Plan {
  const plan = PLANS.find((p) => hasFeature(p, feature));
  if (!plan) throw new Error(`No plan includes ${feature}`);
  return plan;
}
