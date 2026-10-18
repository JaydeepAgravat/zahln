import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { PaymentAttempt, PaymentIntent } from '@zahln/shared';
import { ApiRequestError } from '../src/api';
import { configureApp } from '../src/app';
import { payments } from '../src/payments/client';
import { pendingPayment } from '../src/payments/pending';
import { usePayment } from '../src/payments/usePayment';

jest.mock('react-native-sse', () => jest.fn());
// The native CSPRNG polyfill can't run under Jest; Node's crypto gives the same UUID shape.
jest.mock('../src/random', () => ({
  uuid: () => require('node:crypto').randomUUID(),
  randomSecret: () => 'secret',
}));
jest.mock('../src/payments/client', () => ({
  payments: {
    intentByRef: jest.fn(),
    intent: jest.fn(),
    reportScanned: jest.fn(),
    pay: jest.fn(),
    attemptByKey: jest.fn(),
  },
}));

const api = payments as jest.Mocked<typeof payments>;
const now = new Date().toISOString();
const later = new Date(Date.now() + 5 * 60_000).toISOString();

const intent: PaymentIntent = {
  id: '6f1e1a51-8b8a-4bd0-9a43-0c8d0b0f7a11',
  ref: '6f1e1a51-8b8a-4bd0-9a43-0c8d0b0f7a11.AbCdEf0123_-xyZ9',
  merchant: { id: 'cafe-mila', name: 'Café Mila', handle: 'cafe-mila', city: 'Augsburg' },
  amountCents: 630,
  currency: 'EUR',
  items: [],
  status: 'awaiting_scan',
  refundedCents: 0,
  receiptNumber: null,
  expiresAt: later,
  createdAt: now,
  paidAt: null,
};

const attempt = (key: string, status: PaymentAttempt['status'] = 'paid'): PaymentAttempt => ({
  id: '9a1e1a51-8b8a-4bd0-9a43-0c8d0b0f7a22',
  intentId: intent.id,
  idempotencyKey: key,
  status,
  amountCents: 630,
  tipCents: 0,
  reason: null,
  createdAt: now,
  settledAt: now,
});

async function readyToPay() {
  api.intentByRef.mockResolvedValue(intent);
  api.reportScanned.mockResolvedValue({ ...intent, status: 'scanned' });
  api.intent.mockResolvedValue({ ...intent, status: 'paid', receiptNumber: 7 });
  const hook = await renderHook(() => usePayment());
  await act(() => hook.result.current.load(intent.ref));
  expect(hook.result.current.state.status).toBe('confirming');
  await act(() => hook.result.current.confirm());
  return hook;
}

beforeAll(() => configureApp('consumer'));
beforeEach(() => {
  jest.clearAllMocks();
  pendingPayment.clear();
});

describe('usePayment', () => {
  it('pays with one key that is saved before the request is sent', async () => {
    const hook = await readyToPay();
    let savedBeforeSend: string | undefined;
    api.pay.mockImplementation(async (_id, key) => {
      savedBeforeSend = pendingPayment.read()?.idempotencyKey;
      return { attempt: attempt(key), intent: { ...intent, status: 'paid' } };
    });

    await act(() => hook.result.current.authorised());
    await waitFor(() => expect(hook.result.current.state.status).toBe('paid'));

    const key = api.pay.mock.calls[0]?.[1];
    expect(key).toMatch(/^[0-9a-f-]{36}$/);
    expect(savedBeforeSend).toBe(key);
    expect(pendingPayment.read()).toBeNull(); // cleared once the answer is final
    expect(hook.result.current.confirmedInMs).not.toBeNull();
    // The receipt needs the intent as it is after payment (with its receipt number).
    await waitFor(() => expect(hook.result.current.paidIntent?.receiptNumber).toBe(7));
  });

  it('a dropped response means "checking" with the SAME key, never a second payment', async () => {
    const hook = await readyToPay();
    api.pay.mockRejectedValue(new ApiRequestError(0, 'network', 'network error'));
    api.attemptByKey.mockImplementation(async (key) => attempt(key));

    await act(() => hook.result.current.authorised());
    await waitFor(() => expect(hook.result.current.state.status).toBe('paid'), { timeout: 3000 });

    expect(api.pay).toHaveBeenCalledTimes(1);
    expect(api.attemptByKey).toHaveBeenCalledWith(api.pay.mock.calls[0]?.[1]);
  });

  it('if the server never saw the key, it resends with the same key', async () => {
    const hook = await readyToPay();
    api.pay
      .mockRejectedValueOnce(new ApiRequestError(0, 'network', 'network error'))
      .mockImplementationOnce(async (_id, key) => ({ attempt: attempt(key), intent }));
    api.attemptByKey.mockRejectedValue(new ApiRequestError(404, 'not_found', 'payment attempt not found'));

    await act(() => hook.result.current.authorised());
    await waitFor(() => expect(hook.result.current.state.status).toBe('paid'), { timeout: 3000 });

    expect(api.pay).toHaveBeenCalledTimes(2);
    expect(api.pay.mock.calls[1]?.[1]).toBe(api.pay.mock.calls[0]?.[1]);
  });

  it('an expired code is a definitive "nothing was charged"', async () => {
    const hook = await readyToPay();
    api.pay.mockRejectedValue(new ApiRequestError(409, 'intent_expired', 'expired'));
    await act(() => hook.result.current.authorised());
    await waitFor(() => expect(hook.result.current.state.status).toBe('expired'));
    expect(api.attemptByKey).not.toHaveBeenCalled();
  });

  it('a forged or unknown QR fails before anything can be authorised', async () => {
    api.intentByRef.mockRejectedValue(new ApiRequestError(404, 'not_found', 'payment code not found'));
    const hook = await renderHook(() => usePayment());
    await act(() => hook.result.current.load('nope'));
    expect(hook.result.current.state).toMatchObject({ status: 'failed', reason: 'not_found' });
    await act(() => hook.result.current.authorised());
    expect(api.pay).not.toHaveBeenCalled();
  });
});
