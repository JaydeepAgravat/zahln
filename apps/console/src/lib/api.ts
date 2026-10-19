import { QueryClient } from '@tanstack/react-query';
import type { AdminConfig, IntentStatus, PaymentIntent, Plan } from '@zaster/shared';

export const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

// ---------- Operator session ----------
// Stand-in for SSO: the shared ops token and the operator's name live in this tab only (sessionStorage),
// so closing the tab signs out. Every write the API takes is audited under `console:<name>`.

export type Operator = { token: string; name: string };
const KEY = 'zaster.ops';

export function readOperator(): Operator | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Operator) : null;
  } catch {
    return null;
  }
}
export function saveOperator(op: Operator | null) {
  try {
    if (op) sessionStorage.setItem(KEY, JSON.stringify(op));
    else sessionStorage.removeItem(KEY);
  } catch {
    // Private mode without storage: the session lasts until reload.
  }
}

let operator = readOperator();
const listeners = new Set<() => void>();
export const session = {
  get: () => operator,
  set(op: Operator | null) {
    operator = op;
    saveOperator(op);
    queryClient.clear();
    for (const l of listeners) l();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

// ---------- Requests ----------

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function headers(op: Operator | null, extra?: Record<string, string>): Record<string, string> {
  return {
    ...(op ? { 'x-admin-token': op.token, 'x-admin-name': op.name } : {}),
    ...extra,
  };
}

export async function request<T>(
  method: 'GET' | 'PUT' | 'POST',
  path: string,
  opts: { body?: unknown; key?: string; op?: Operator | null } = {},
): Promise<T> {
  const op = opts.op === undefined ? operator : opts.op;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(op, {
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.key ? { 'idempotency-key': opts.key } : {}),
    }),
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    if (res.status === 401 && opts.op === undefined) session.set(null);
    throw new ApiError(res.status, json?.error ?? 'error', json?.message ?? res.statusText);
  }
  return json as T;
}

/** Downloads need the ops headers, so a plain link won't do: fetch, then hand the browser a blob. */
export async function download(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, { headers: headers(operator) });
  if (!res.ok) throw new ApiError(res.status, 'error', 'download failed');
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Shapes the admin API returns ----------

export type AdminPayment = PaymentIntent & { payerName: string | null };
export type PaymentDetail = {
  intent: PaymentIntent;
  attempts: {
    id: string;
    status: string;
    payerName: string | null;
    amountCents: number;
    tipCents: number;
    reason: string | null;
    idempotencyKey: string;
    createdAt: string;
    settledAt: string | null;
  }[];
  refunds: { id: string; amountCents: number; reason: string; by: string | null; createdAt: string }[];
  timeline: { type: string; data: Record<string, unknown>; at: string }[];
  ledger: {
    transactionId: string;
    kind: string;
    accountId: string;
    amountCents: number;
    createdAt: string;
  }[];
};
export type MerchantRow = {
  id: string;
  name: string;
  handle: string;
  city: string;
  plan: Plan;
  staffCount: number;
  todayCents: number;
};
export type MerchantDetail = Omit<MerchantRow, 'staffCount' | 'todayCents'> & {
  staff: { name: string; role: string }[];
  recent: PaymentIntent[];
};
export type StoredConfig = { version: number; data: AdminConfig; updatedAt: string };
export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  target: string;
  reason: string;
  data: Record<string, unknown> | null;
  createdAt: string;
};

export const api = {
  me: (op?: Operator) => request<{ actor: string }>('GET', '/admin/me', op ? { op } : {}),
  payments: (q: string, status: IntentStatus | '') =>
    request<AdminPayment[]>(
      'GET',
      `/admin/payments?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), limit: '100' })}`,
    ),
  payment: (id: string) => request<PaymentDetail>('GET', `/admin/payments/${id}`),
  refund: (id: string, amountCents: number, reason: string, key: string) =>
    request('POST', `/admin/payments/${id}/refunds`, { body: { amountCents, reason }, key }),
  merchants: () => request<MerchantRow[]>('GET', '/admin/merchants'),
  merchant: (id: string) => request<MerchantDetail>('GET', `/admin/merchants/${id}`),
  setPlan: (id: string, plan: Plan, reason: string) =>
    request('PUT', `/admin/merchants/${id}/plan`, { body: { plan, reason } }),
  config: () => request<StoredConfig>('GET', '/admin/config'),
  saveConfig: (data: AdminConfig, reason: string) =>
    request<StoredConfig>('PUT', '/admin/config', { body: { data, reason } }),
  chaos: () => request<{ mode: string }>('GET', '/admin/chaos'),
  setChaos: (mode: string) => request<{ mode: string }>('PUT', '/admin/chaos', { body: { mode } }),
  reset: () => request('POST', '/admin/reset'),
  audit: () => request<AuditEntry[]>('GET', '/admin/audit?limit=200'),
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5_000, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 },
  },
});
