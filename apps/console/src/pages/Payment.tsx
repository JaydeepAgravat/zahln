import { useQuery } from '@tanstack/react-query';
import { isRefundable } from '@zahln/shared';
import {
  Badge,
  Button,
  Card,
  cx,
  Empty,
  Field,
  Input,
  money,
  Spinner,
  StatusBadge,
  when,
} from '@zahln/web-ui';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, type PaymentDetail, queryClient } from '../lib/api';
import { errorText, Id, PageHeader, ReasonDialog } from '../lib/ui';

const EVENT_LABEL: Record<string, string> = {
  'intent.created': 'QR shown at the till',
  'intent.scanned': 'Customer scanned and is checking',
  'intent.paid': 'Paid, money settled',
  'intent.expired': 'QR expired unpaid',
  'intent.refunded': 'Refund booked',
};

const ACCOUNT_LABEL = (id: string) => {
  const [kind, owner] = id.split(':');
  const name =
    kind === 'consumer_wallet'
      ? 'Customer wallet'
      : kind === 'merchant_wallet'
        ? 'Merchant wallet'
        : kind === 'topup_source'
          ? 'Top-up source (bank)'
          : kind;
  return { name, owner: owner ?? '' };
};

function Timeline({ detail }: { detail: PaymentDetail }) {
  // Events, attempts and refunds in one list, in time order: the full story of this payment.
  const items = [
    ...detail.timeline.map((e) => ({
      key: `${e.type}-${e.at}`,
      at: e.at,
      title: EVENT_LABEL[e.type] ?? e.type,
      sub: e.type,
      tone: 'ink',
    })),
    ...detail.attempts.map((a) => ({
      key: a.id,
      at: a.createdAt,
      title: `Pay request: ${a.status.replace('_', ' ')}`,
      sub: `${a.payerName ?? 'unknown payer'} · key ${a.idempotencyKey.slice(0, 8)}${a.reason ? ` · ${a.reason}` : ''}`,
      tone: a.status === 'paid' ? 'success' : a.status === 'processing' ? 'pending' : 'danger',
    })),
    ...detail.refunds.map((r) => ({
      key: r.id,
      at: r.createdAt,
      title: `Refund ${money(r.amountCents)}`,
      sub: `${r.by ?? ''} · ${r.reason}`,
      tone: 'warning',
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  return (
    <ol className="flex flex-col px-5 py-4">
      {items.map((item, i) => (
        <li key={item.key} className="relative flex gap-4 pb-5 last:pb-0">
          {i < items.length - 1 ? (
            <span aria-hidden className="absolute top-3 left-[5px] h-full w-px bg-border" />
          ) : null}
          <span
            aria-hidden
            className={cx(
              'relative mt-1.5 size-[11px] shrink-0 rounded-full ring-4 ring-surface',
              item.tone === 'success'
                ? 'bg-success'
                : item.tone === 'danger'
                  ? 'bg-danger'
                  : item.tone === 'warning'
                    ? 'bg-accent'
                    : item.tone === 'pending'
                      ? 'bg-pending'
                      : 'bg-text-primary',
            )}
          />
          <div className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4">
            <div>
              <p className="text-callout font-medium">{item.title}</p>
              <p className="text-footnote text-text-tertiary">{item.sub}</p>
            </div>
            <time className="font-mono text-footnote text-text-secondary tabular-nums">{when(item.at)}</time>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Ledger({ detail }: { detail: PaymentDetail }) {
  const byTx = Map.groupBy(detail.ledger, (l) => l.transactionId);
  const total = detail.ledger.reduce((s, l) => s + l.amountCents, 0);
  if (!detail.ledger.length)
    return <Empty title="No money has moved">Nothing was posted to the ledger.</Empty>;
  return (
    <div className="flex flex-col">
      {[...byTx].map(([tx, rows]) => (
        <div key={tx} className="border-b border-border px-5 py-3 last:border-0">
          <div className="mb-2 flex items-center gap-2">
            <Badge tone={rows[0]?.kind === 'refund' ? 'warning' : 'success'}>{rows[0]?.kind}</Badge>
            <Id value={tx} />
          </div>
          <table className="w-full text-callout">
            <tbody>
              {rows.map((r) => {
                const a = ACCOUNT_LABEL(r.accountId);
                return (
                  <tr key={`${r.accountId}-${r.amountCents}`}>
                    <td className="py-0.5">
                      {a.name} <span className="font-mono text-footnote text-text-tertiary">{a.owner}</span>
                    </td>
                    <td
                      className={cx(
                        'py-0.5 text-right font-medium tabular-nums',
                        r.amountCents < 0 ? 'text-danger' : 'text-success',
                      )}
                    >
                      {r.amountCents > 0 ? '+' : ''}
                      {money(r.amountCents)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      <p className="flex justify-between bg-surface-muted/50 px-5 py-2.5 text-footnote text-text-secondary">
        <span>Sum of all postings (double entry: must be zero)</span>
        <span className={cx('font-mono font-semibold', total === 0 ? 'text-success' : 'text-danger')}>
          {money(total)}
        </span>
      </p>
    </div>
  );
}

export function PaymentPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['payment', id], queryFn: () => api.payment(id) });
  const [refunding, setRefunding] = useState(false);
  const [amount, setAmount] = useState('');
  // One key per refund dialog: a double click or a retry after a timeout can't refund twice.
  const [key, setKey] = useState(() => crypto.randomUUID());

  if (query.isLoading) return <Spinner className="m-10" />;
  if (query.error || !query.data) return <Empty title="Payment not found">{errorText(query.error)}</Empty>;
  const { intent, attempts } = query.data;
  const remaining = intent.amountCents - intent.refundedCents;
  const cents = amount ? Math.round(Number(amount.replace(',', '.')) * 100) : remaining;
  const validAmount = Number.isInteger(cents) && cents > 0 && cents <= remaining;
  const paid = attempts.find((a) => a.status === 'paid');
  const payer = paid?.payerName;

  return (
    <div className="flex flex-col gap-6">
      <Link to="/payments" className="text-footnote text-text-secondary hover:text-text-primary">
        ← Payments
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span className="tabular-nums">{money(intent.amountCents)}</span>
            <StatusBadge status={intent.status} />
          </span>
        }
        sub={
          <>
            {intent.merchant.name}
            {payer ? ` · paid by ${payer}` : ''}
            {intent.receiptNumber ? ` · receipt ${intent.receiptNumber}` : ''} ·{' '}
            <Id value={intent.id} short={36} />
          </>
        }
        actions={
          isRefundable(intent.status) ? (
            <Button
              variant="primary"
              onClick={() => {
                setAmount('');
                setKey(crypto.randomUUID());
                setRefunding(true);
              }}
            >
              Refund…
            </Button>
          ) : null
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-6">
          <Card title="Timeline">
            <Timeline detail={query.data} />
          </Card>
          <Card title="Ledger">
            <Ledger detail={query.data} />
          </Card>
        </div>
        <Card title="Receipt" className="self-start">
          <div className="flex flex-col gap-2 px-5 py-4 text-callout">
            {intent.items.length ? (
              intent.items.map((item) => (
                <div key={item.sku} className="flex justify-between gap-4">
                  <span>
                    {item.qty}× {item.name}{' '}
                    <span className="text-footnote text-text-tertiary">{item.vatRate} %</span>
                  </span>
                  <span className="tabular-nums">{money(item.unitPriceCents * item.qty)}</span>
                </div>
              ))
            ) : (
              <p className="text-text-tertiary">Amount typed at the till, no items.</p>
            )}
            <div className="mt-2 flex justify-between border-t border-dashed border-border-strong pt-3 font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(intent.amountCents)}</span>
            </div>
            {paid?.tipCents ? (
              <div className="flex justify-between text-text-secondary">
                <span>Tip (to the merchant)</span>
                <span className="tabular-nums">+{money(paid.tipCents)}</span>
              </div>
            ) : null}
            {intent.refundedCents ? (
              <div className="flex justify-between text-warning">
                <span>Refunded</span>
                <span className="tabular-nums">−{money(intent.refundedCents)}</span>
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <ReasonDialog
        open={refunding}
        onClose={() => setRefunding(false)}
        title={`Refund ${intent.merchant.name}`}
        confirm={validAmount ? `Refund ${money(cents)}` : 'Refund'}
        danger
        suggestions={['Customer called support', 'Charged twice', 'Merchant asked us to']}
        onConfirm={async (reason) => {
          if (!validAmount) throw new Error(`Enter an amount up to ${money(remaining)}`);
          await api.refund(intent.id, cents, reason, key);
          await queryClient.invalidateQueries({ queryKey: ['payment', intent.id] });
          await queryClient.invalidateQueries({ queryKey: ['payments'] });
        }}
      >
        <p className="mb-4">
          The money goes back to {payer ?? 'the customer'}'s wallet straight away. This works even while
          refunds are switched off in the apps.
        </p>
        <Field label="Amount" hint={`Up to ${money(remaining)}. Leave empty for the full amount.`}>
          {(fid) => (
            <Input
              id={fid}
              inputMode="decimal"
              placeholder={money(remaining).replace(/\s?€/, '')}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          )}
        </Field>
      </ReasonDialog>
    </div>
  );
}
