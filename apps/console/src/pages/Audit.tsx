import { useQuery } from '@tanstack/react-query';
import { Badge, Card, Empty, Spinner, type Tone, when } from '@zahln/web-ui';
import { Link } from 'react-router';
import { type AuditEntry, api } from '../lib/api';
import { errorText, PageHeader } from '../lib/ui';

const ACTION: Record<string, { label: string; tone: Tone }> = {
  'config.update': { label: 'Config', tone: 'info' },
  'payment.refund': { label: 'Refund', tone: 'warning' },
  'merchant.plan': { label: 'Plan', tone: 'brand' },
  'merchant.export': { label: 'Export', tone: 'neutral' },
  'chaos.set': { label: 'Rail', tone: 'danger' },
  'demo.reset': { label: 'Reset', tone: 'danger' },
};

function Target({ entry }: { entry: AuditEntry }) {
  if (entry.action === 'payment.refund')
    return (
      <Link to={`/payments/${entry.target}`} className="font-mono underline-offset-2 hover:underline">
        {entry.target.slice(0, 8)}
      </Link>
    );
  if (entry.action.startsWith('merchant.'))
    return (
      <Link to={`/merchants/${entry.target}`} className="underline-offset-2 hover:underline">
        {entry.target}
      </Link>
    );
  return <span>{entry.target}</span>;
}

function Detail({ entry }: { entry: AuditEntry }) {
  const d = entry.data ?? {};
  if (Array.isArray(d.changed))
    return <span className="font-mono">{(d.changed as string[]).join(', ')}</span>;
  if ('from' in d) return <span>{`${d.from} → ${d.to}`}</span>;
  if ('mode' in d) return <span className="font-mono">{String(d.mode)}</span>;
  if ('rows' in d) return <span>{String(d.rows)} payments</span>;
  return null;
}

/** Append-only (the database rejects UPDATE and DELETE on this table): who did what, to what, and why. */
export function AuditPage() {
  const query = useQuery({ queryKey: ['audit'], queryFn: api.audit });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        sub="Every change made from this console. Nothing here can be edited or deleted."
      />
      <Card>
        {query.isLoading ? (
          <Spinner className="m-6" />
        ) : query.error ? (
          <Empty title="Couldn't load the audit log">{errorText(query.error)}</Empty>
        ) : !query.data?.length ? (
          <Empty title="Nothing yet">
            Changes from the control room, refunds and plan changes appear here.
          </Empty>
        ) : (
          <table className="w-full text-callout">
            <thead>
              <tr className="border-b border-border text-left text-caption text-text-tertiary uppercase">
                <th className="px-5 py-2.5 font-medium">When</th>
                <th className="px-5 py-2.5 font-medium">Who</th>
                <th className="px-5 py-2.5 font-medium">What</th>
                <th className="px-5 py-2.5 font-medium">Why</th>
              </tr>
            </thead>
            <tbody>
              {query.data.map((e) => {
                const action = ACTION[e.action] ?? { label: e.action, tone: 'neutral' as Tone };
                return (
                  <tr key={e.id} className="border-b border-border align-top last:border-0">
                    <td className="px-5 py-3 font-mono text-footnote whitespace-nowrap text-text-secondary tabular-nums">
                      {when(e.createdAt)}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{e.actor.replace(/^console:/, '')}</td>
                    <td className="px-5 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <Badge tone={action.tone}>{action.label}</Badge>
                        <Target entry={e} />
                        <span className="text-footnote text-text-tertiary">
                          <Detail entry={e} />
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-text-secondary">{e.reason}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
