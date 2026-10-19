'use client';

import { Button, Card, Dialog, Empty } from '@zaster/web-ui';
import { useRef, useState } from 'react';
import { useT } from '@/components/I18n';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { ApiError, api } from '@/lib/client';
import { dateTime, money } from '@/lib/format';
import type { Payouts } from '@/lib/types';

export function PayoutsView({ initial, isOwner }: { initial: Payouts; isOwner: boolean }) {
  const { t, locale } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const [data, setData] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const key = useRef(crypto.randomUUID());

  const payOut = async () => {
    setBusy(true);
    try {
      const res = await stepUp(() =>
        api<{ amountCents: number }>('POST', '/web/business/payouts', { key: key.current }),
      );
      key.current = crypto.randomUUID();
      toast(t('payouts.done', { amount: money(res.amountCents, locale) }));
      setConfirming(false);
      setData(await api<Payouts>('GET', '/web/business/payouts'));
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'cancelled'))
        toast(t('common.error', { message: e instanceof Error ? e.message : String(e) }), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-title font-bold tracking-tight">{t('payouts.title')}</h1>
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-6 px-6 py-6">
          <div>
            <p className="text-callout text-text-secondary">{t('payouts.balance')}</p>
            <p className="text-[2.75rem] leading-tight font-bold tracking-tight tabular-nums">
              {money(data.balanceCents, locale)}
            </p>
            <p className="text-footnote text-text-tertiary">
              {data.automatic
                ? `${t('payouts.next')}: ${dateTime(data.nextSettlementAt, locale).slice(0, -3)}`
                : t('payouts.manual')}
            </p>
          </div>
          <Button
            variant="primary"
            disabled={!isOwner || data.balanceCents <= 0}
            title={isOwner ? undefined : t('common.ownerOnly')}
            onClick={() => setConfirming(true)}
          >
            {t('payouts.now')}
          </Button>
        </div>
      </Card>
      <Card title={t('payouts.history')}>
        {data.history.length === 0 ? (
          <Empty title={t('payouts.empty')} />
        ) : (
          <ul>
            {data.history.map((p) => (
              <li
                key={p.id}
                className="flex justify-between border-b border-border px-5 py-3 text-callout last:border-0"
              >
                <span className="font-mono text-footnote text-text-secondary tabular-nums">
                  {dateTime(p.createdAt, locale)}
                </span>
                <span className="font-medium tabular-nums">{money(p.amountCents, locale)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Dialog open={confirming} onClose={() => setConfirming(false)} title={t('payouts.now')}>
        <p className="text-callout text-text-secondary">
          {t('payouts.nowConfirm', { amount: money(data.balanceCents, locale) })}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirming(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" busy={busy} onClick={payOut}>
            {t('payouts.now')}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
