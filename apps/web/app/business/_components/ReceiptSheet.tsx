'use client';

import { includedVat, isRefundable, type VatRate } from '@zahln/shared';
import { Button, cx, Field, Input, Spinner } from '@zahln/web-ui';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/components/I18n';
import { Status } from '@/components/Status';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { ApiError, api } from '@/lib/client';
import { dateTime, money } from '@/lib/format';
import type { MessageKey } from '@/lib/i18n-messages';
import type { Receipt } from '@/lib/types';

const REASONS: MessageKey[] = ['receipt.reasonWrong', 'receipt.reasonUnhappy', 'receipt.reasonDouble'];

/**
 * One receipt, slid in from the right. Shows what GoBD needs (sequence number, timestamp, VAT per rate)
 * and the refund: amount (defaults to what's left), reason, step-up, one idempotent request.
 */
export function ReceiptSheet({
  intentId,
  onClose,
  onChanged,
  canRefund = true,
}: {
  intentId: string | null;
  onClose: () => void;
  onChanged?: () => void;
  canRefund?: boolean;
}) {
  const { t, locale } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState<MessageKey>('receipt.reasonWrong');
  const [busy, setBusy] = useState(false);
  // One key per refund form: a double click or a retry can't refund twice.
  const key = useRef(crypto.randomUUID());

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (intentId && !d.open) d.showModal();
    if (!intentId && d.open) d.close();
    setReceipt(null);
    setError(null);
    setRefunding(false);
    if (!intentId) return;
    api<Receipt>('GET', `/web/business/transactions/${intentId}`)
      .then(setReceipt)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [intentId]);

  const intent = receipt?.intent;
  const remaining = intent ? intent.amountCents - intent.refundedCents : 0;
  const cents = amount ? Math.round(Number(amount.replace(',', '.')) * 100) : remaining;
  const validAmount = Number.isInteger(cents) && cents > 0 && cents <= remaining;

  const byRate = new Map<number, number>();
  for (const item of intent?.items ?? [])
    byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + item.unitPriceCents * item.qty);

  const refund = async () => {
    if (!intent) return;
    setBusy(true);
    try {
      await stepUp(() =>
        api('POST', `/web/business/transactions/${intent.id}/refunds`, {
          body: { amountCents: cents, reason: t(reason) },
          key: key.current,
        }),
      );
      key.current = crypto.randomUUID();
      toast(t('receipt.refundDone', { amount: money(cents, locale) }));
      setRefunding(false);
      setAmount('');
      setReceipt(await api<Receipt>('GET', `/web/business/transactions/${intent.id}`));
      onChanged?.();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'cancelled')) {
        toast(t('common.error', { message: e instanceof Error ? e.message : String(e) }), 'error');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-label={
        intent?.receiptNumber ? t('receipt.title', { number: intent.receiptNumber }) : t('receipt.noNumber')
      }
      className="mt-0 mr-0 mb-0 ml-auto h-dvh max-h-dvh w-[min(26rem,100vw)] max-w-none border-l border-border bg-surface p-0 text-text-primary backdrop:bg-ink/30"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-headline font-semibold">
            {intent?.receiptNumber
              ? t('receipt.title', { number: intent.receiptNumber })
              : t('receipt.noNumber')}
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label={t('common.cancel')}
            className="grid size-9 place-items-center rounded-full text-text-secondary hover:bg-surface-muted"
          >
            ✕
          </button>
        </header>
        {error ? (
          <p className="p-6 text-callout text-danger">{error}</p>
        ) : !receipt || !intent ? (
          <Spinner className="m-6" />
        ) : (
          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-display font-bold tracking-tight tabular-nums">
                  {money(intent.amountCents, locale)}
                </p>
                <p className="font-mono text-footnote text-text-tertiary tabular-nums">
                  {dateTime(intent.paidAt ?? intent.createdAt, locale)}
                </p>
              </div>
              <Status status={intent.status} />
            </div>

            <div className="flex flex-col gap-2 rounded-md bg-surface-muted/50 p-4 text-callout">
              <p className="font-semibold">{intent.merchant.name}</p>
              {intent.items.map((item) => (
                <div key={item.sku} className="flex justify-between gap-4">
                  <span>
                    {item.qty}× {item.name}
                  </span>
                  <span className="tabular-nums">{money(item.unitPriceCents * item.qty, locale)}</span>
                </div>
              ))}
              <div className="mt-1 flex justify-between border-t border-dashed border-border-strong pt-2 font-semibold">
                <span>{t('receipt.total')}</span>
                <span className="tabular-nums">{money(intent.amountCents, locale)}</span>
              </div>
              {[...byRate].map(([rate, gross]) => (
                <div key={rate} className="flex justify-between text-footnote text-text-tertiary">
                  <span>{t('receipt.vat', { rate })}</span>
                  <span className="tabular-nums">{money(includedVat(gross, rate as VatRate), locale)}</span>
                </div>
              ))}
              {receipt.tipCents ? (
                <div className="flex justify-between text-footnote text-text-secondary">
                  <span>{t('receipt.tip')}</span>
                  <span className="tabular-nums">+{money(receipt.tipCents, locale)}</span>
                </div>
              ) : null}
            </div>

            <dl className="flex flex-col gap-1 text-footnote text-text-secondary">
              {receipt.payerName ? <dd>{t('receipt.paidBy', { name: receipt.payerName })}</dd> : null}
              {receipt.staffName ? <dd>{t('receipt.till', { name: receipt.staffName })}</dd> : null}
              <dd className="font-mono text-text-tertiary">{intent.id}</dd>
            </dl>

            {receipt.refunds.length ? (
              <ul className="flex flex-col gap-2">
                {receipt.refunds.map((r) => (
                  <li
                    key={r.id}
                    className="flex justify-between gap-4 rounded-md bg-warning-subtle px-3 py-2 text-footnote"
                  >
                    <span>
                      {t('receipt.refunded')} · {r.reason} · {r.by}
                    </span>
                    <span className="font-semibold text-warning tabular-nums">
                      −{money(r.amountCents, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}

            {canRefund && isRefundable(intent.status) ? (
              refunding ? (
                <div className="flex flex-col gap-4 border-t border-border pt-5">
                  <Field label={t('receipt.refundAmount')} hint={money(remaining, locale)}>
                    {(id) => (
                      <Input
                        id={id}
                        inputMode="decimal"
                        placeholder={money(remaining, locale).replace(/\s?€/, '')}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    )}
                  </Field>
                  <fieldset className="flex flex-wrap gap-2">
                    <legend className="mb-2 text-footnote font-medium text-text-secondary">
                      {t('receipt.refundReason')}
                    </legend>
                    {REASONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        aria-pressed={r === reason}
                        onClick={() => setReason(r)}
                        className={cx(
                          'h-8 rounded-full px-3 text-footnote',
                          r === reason
                            ? 'bg-text-primary text-bg'
                            : 'border border-border hover:bg-surface-muted',
                        )}
                      >
                        {t(r)}
                      </button>
                    ))}
                  </fieldset>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setRefunding(false)}>
                      {t('common.cancel')}
                    </Button>
                    <Button variant="primary" busy={busy} disabled={!validAmount} onClick={refund}>
                      {t('receipt.refundConfirm', { amount: money(validAmount ? cents : remaining, locale) })}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button onClick={() => setRefunding(true)}>{t('receipt.refund')}</Button>
              )
            ) : null}
          </div>
        )}
      </div>
    </dialog>
  );
}
