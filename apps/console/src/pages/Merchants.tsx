import { useQuery } from '@tanstack/react-query';
import { PLAN_FEATURES, PLANS, type Plan } from '@zaster/shared';
import { Badge, Button, Card, cx, Empty, money, Spinner, StatusBadge, type Tone, when } from '@zaster/web-ui';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, download, queryClient } from '../lib/api';
import { errorText, Id, PageHeader, ReasonDialog } from '../lib/ui';

const PLAN_TONE: Record<Plan, Tone> = { free: 'neutral', pro: 'brand', business: 'info' };
const planName = (p: Plan) => p[0]?.toUpperCase() + p.slice(1);
export const PlanBadge = ({ plan }: { plan: Plan }) => <Badge tone={PLAN_TONE[plan]}>{planName(plan)}</Badge>;

export function MerchantsPage() {
  const navigate = useNavigate();
  const query = useQuery({ queryKey: ['merchants'], queryFn: api.merchants });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Merchants" sub="Plans, teams and today's takings." />
      <Card>
        {query.isLoading ? (
          <Spinner className="m-6" />
        ) : query.error ? (
          <Empty title="Couldn't load merchants">{errorText(query.error)}</Empty>
        ) : (
          <table className="w-full text-callout">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-tertiary uppercase">
                <th className="px-5 py-2.5 font-medium">Merchant</th>
                <th className="px-5 py-2.5 font-medium">Plan</th>
                <th className="px-5 py-2.5 font-medium">Staff</th>
                <th className="px-5 py-2.5 text-right font-medium">Today</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((m) => (
                <tr
                  key={m.id}
                  tabIndex={0}
                  onClick={() => navigate(`/merchants/${m.id}`)}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/merchants/${m.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/60 focus-visible:bg-surface-muted focus-visible:outline-none"
                >
                  <td className="px-5 py-3">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-footnote text-text-tertiary">
                      @{m.handle} · {m.city}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <PlanBadge plan={m.plan} />
                  </td>
                  <td className="px-5 py-3 tabular-nums">{m.staffCount}</td>
                  <td className="px-5 py-3 text-right font-medium tabular-nums">{money(m.todayCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

export function MerchantPage() {
  const { id = '' } = useParams();
  const query = useQuery({ queryKey: ['merchant', id], queryFn: () => api.merchant(id) });
  const [next, setNext] = useState<Plan | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);

  if (query.isLoading) return <Spinner className="m-10" />;
  if (query.error || !query.data) return <Empty title="Merchant not found">{errorText(query.error)}</Empty>;
  const m = query.data;
  const gained = next ? PLAN_FEATURES[next].filter((f) => !PLAN_FEATURES[m.plan].includes(f)) : [];
  const lost = next ? PLAN_FEATURES[m.plan].filter((f) => !PLAN_FEATURES[next].includes(f)) : [];

  return (
    <div className="flex flex-col gap-6">
      <Link to="/merchants" className="text-footnote text-text-secondary hover:text-text-primary">
        ← Merchants
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {m.name} <PlanBadge plan={m.plan} />
          </span>
        }
        sub={`@${m.handle} · ${m.city}`}
        actions={
          <Button
            busy={exporting === 'csv'}
            onClick={async () => {
              setExporting('csv');
              try {
                await download(`/admin/merchants/${m.id}/export.csv`, `zaster-${m.id}.csv`);
                void queryClient.invalidateQueries({ queryKey: ['audit'] });
              } finally {
                setExporting(null);
              }
            }}
          >
            Export CSV (DATEV)
          </Button>
        }
      />

      <Card title="Plan">
        <div className="flex flex-col gap-4 px-5 py-4">
          <fieldset className="grid gap-3 sm:grid-cols-3">
            <legend className="sr-only">Plan</legend>
            {PLANS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={p === m.plan}
                onClick={() => p !== m.plan && setNext(p)}
                className={cx(
                  'flex flex-col gap-2 rounded-sm border p-4 text-left transition-colors',
                  p === m.plan
                    ? 'border-text-primary bg-surface-muted/50'
                    : 'border-border hover:border-border-strong',
                )}
              >
                <span className="flex items-center justify-between">
                  <span className="font-semibold">{planName(p)}</span>
                  {p === m.plan ? <span className="text-caption text-text-tertiary">current</span> : null}
                </span>
                <span className="text-footnote text-text-tertiary">
                  {PLAN_FEATURES[p].map((f) => f.replaceAll('_', ' ')).join(' · ')}
                </span>
              </button>
            ))}
          </fieldset>
          <p className="text-footnote text-text-tertiary">
            The merchant's tills pick a change up within a second, no app update.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
        <Card title="Team" className="self-start">
          <ul className="flex flex-col px-5 py-2">
            {m.staff.map((s) => (
              <li key={s.name} className="flex justify-between border-b border-border py-2 last:border-0">
                <span>{s.name}</span>
                <span className="text-footnote text-text-tertiary capitalize">{s.role}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title="Recent payments">
          {m.recent.length === 0 ? (
            <Empty title="No payments yet" />
          ) : (
            <ul className="flex flex-col">
              {m.recent.map((p) => (
                <li key={p.id} className="border-b border-border last:border-0">
                  <Link
                    to={`/payments/${p.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-surface-muted/60"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-footnote text-text-secondary tabular-nums">
                        {when(p.createdAt)}
                      </span>
                      <Id value={p.id} />
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-medium tabular-nums">{money(p.amountCents)}</span>
                      <StatusBadge status={p.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ReasonDialog
        open={next !== null}
        onClose={() => setNext(null)}
        title={next ? `Move ${m.name} to ${planName(next)}` : ''}
        confirm={next ? `Switch to ${planName(next)}` : 'Switch'}
        suggestions={['Signed the Pro plan', 'Downgrade requested', 'Trial for the demo']}
        onConfirm={async (reason) => {
          if (!next) return;
          await api.setPlan(m.id, next, reason);
          await queryClient.invalidateQueries({ queryKey: ['merchant', m.id] });
          await queryClient.invalidateQueries({ queryKey: ['merchants'] });
          await queryClient.invalidateQueries({ queryKey: ['audit'] });
        }}
      >
        {gained.length ? <p>Unlocks: {gained.map((f) => f.replaceAll('_', ' ')).join(', ')}.</p> : null}
        {lost.length ? (
          <p className="text-danger">Removes: {lost.map((f) => f.replaceAll('_', ' ')).join(', ')}.</p>
        ) : null}
      </ReasonDialog>
    </div>
  );
}
