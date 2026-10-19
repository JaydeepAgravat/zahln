import { useQuery } from '@tanstack/react-query';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { INTENT_STATUSES, type IntentStatus } from '@zaster/shared';
import {
  Card,
  cx,
  Empty,
  Input,
  money,
  Select,
  Spinner,
  StatusBadge,
  statusLabel,
  when,
} from '@zaster/web-ui';
import { useDeferredValue } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { type AdminPayment, api } from '../lib/api';
import { isFresh } from '../lib/live';
import { errorText, Id, PageHeader } from '../lib/ui';

const features = tableFeatures({});
const col = createColumnHelper<typeof features, AdminPayment>();
const columns = col.columns([
  col.accessor('createdAt', {
    header: 'Time',
    cell: (c) => <span className="tabular-nums text-text-secondary">{when(c.getValue())}</span>,
  }),
  col.accessor('id', { header: 'Payment', cell: (c) => <Id value={c.getValue()} /> }),
  col.accessor((p) => p.merchant.name, { id: 'merchant', header: 'Merchant' }),
  col.accessor('payerName', {
    header: 'Payer',
    cell: (c) => c.getValue() ?? <span className="text-text-tertiary">–</span>,
  }),
  col.accessor('amountCents', {
    header: () => <span className="block text-right">Amount</span>,
    cell: (c) => (
      <span className="block text-right font-medium tabular-nums">
        {money(c.getValue())}
        {c.row.original.refundedCents > 0 ? (
          <span className="block text-caption text-warning">−{money(c.row.original.refundedCents)}</span>
        ) : null}
      </span>
    ),
  }),
  col.accessor('status', { header: 'Status', cell: (c) => <StatusBadge status={c.getValue()} /> }),
]);

/**
 * Support's first stop: "a student says they paid 6,30 € at Café Mila". Search by amount, merchant,
 * payer or ID prefix; rows update live as phones pay, so the operator watches it happen.
 */
export function PaymentsPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as IntentStatus | '';
  const deferredQ = useDeferredValue(q);
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['payments', deferredQ, status],
    queryFn: () => api.payments(deferredQ, status),
    placeholderData: (prev) => prev,
  });
  const table = useTable({ features, columns, data: query.data ?? EMPTY });

  const set = (key: string, value: string) =>
    setParams(
      (p) => {
        if (value) p.set(key, value);
        else p.delete(key);
        return p;
      },
      { replace: true },
    );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payments" sub="Every payment on every till, live." />
      <div className="flex flex-wrap gap-3">
        <Input
          type="search"
          autoFocus
          aria-label="Search payments"
          placeholder="Search amount (6,30), merchant, payer or ID"
          value={q}
          onChange={(e) => set('q', e.target.value)}
          className="max-w-md flex-1"
        />
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => set('status', e.target.value)}
          className="w-48"
        >
          <option value="">All statuses</option>
          {INTENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </Select>
        {query.isFetching ? <Spinner className="self-center text-text-tertiary" /> : null}
      </div>
      <Card>
        {query.error ? (
          <Empty title="Couldn't load payments">{errorText(query.error)}</Empty>
        ) : query.data && query.data.length === 0 ? (
          <Empty title="No payments match">Try an amount like 6,30 or part of a merchant's name.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-callout">
              <thead>
                {table.getHeaderGroups().map((g) => (
                  <tr key={g.id} className="border-b border-border text-left">
                    {g.headers.map((h) => (
                      <th
                        key={h.id}
                        className="px-5 py-2.5 text-caption font-medium text-text-tertiary uppercase"
                      >
                        <table.FlexRender header={h} />
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    tabIndex={0}
                    onClick={() => navigate(`/payments/${row.original.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`/payments/${row.original.id}`)}
                    className={cx(
                      'cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none',
                      isFresh(row.original.id) && 'animate-[flash_2.5s_ease-out]',
                    )}
                  >
                    {row.getAllCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-3">
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

const EMPTY: AdminPayment[] = [];
