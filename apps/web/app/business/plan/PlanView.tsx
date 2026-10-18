'use client';

import { type Feature, PLAN_FEATURES, PLANS, type Plan } from '@zahln/shared';
import { Button, cx } from '@zahln/web-ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/components/I18n';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { ApiError, api } from '@/lib/client';

const NAME: Record<Plan, string> = { free: 'Free', pro: 'Pro', business: 'Business' };

const FEATURE: Record<Feature, { de: string; en: string }> = {
  static_qr: { de: 'Fester QR-Code (@handle)', en: 'Static QR code (@handle)' },
  dynamic_qr: { de: 'QR pro Zahlung an der Kasse', en: 'One-time QR at the till' },
  staff_roles: { de: 'Team mit Rollen', en: 'Team with roles' },
  refunds: { de: 'Erstattungen', en: 'Refunds' },
  tips: { de: 'Trinkgeld', en: 'Tips' },
  live_dashboard: { de: 'Live-Dashboard', en: 'Live dashboard' },
  shift_reports: { de: 'Schicht- und Tagesberichte', en: 'Shift and daily reports' },
  catalogue: { de: 'Artikelkatalog', en: 'Item catalogue' },
  csv_export: { de: 'DATEV-Export', en: 'DATEV export' },
  daily_auto_settlement: { de: 'Tägliche Auszahlung um 23 Uhr', en: 'Daily payout at 11 pm' },
};

export function PlanView({ current, isOwner }: { current: Plan; isOwner: boolean }) {
  const { t, locale } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<Plan | null>(null);

  const choose = async (plan: Plan) => {
    setBusy(plan);
    try {
      await stepUp(() => api('PUT', '/web/business/plan', { body: { plan } }));
      toast(t('plan.done', { plan: NAME[plan] }));
      router.refresh();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'cancelled'))
        toast(t('common.error', { message: e instanceof Error ? e.message : String(e) }), 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold tracking-tight">{t('plan.title')}</h1>
        <p className="text-callout text-text-secondary">{t('plan.fees')}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan === current;
          return (
            <section
              key={plan}
              className={cx(
                'flex flex-col gap-5 rounded-lg border bg-surface p-6',
                isCurrent ? 'border-text-primary' : 'border-border',
              )}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-headline font-bold">{NAME[plan]}</h2>
                {isCurrent ? (
                  <span className="text-caption text-text-tertiary">{t('plan.current')}</span>
                ) : null}
              </div>
              <ul className="flex flex-1 flex-col gap-2 text-callout">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex gap-2">
                    <span aria-hidden className="text-success">
                      ✓
                    </span>
                    {FEATURE[f][locale]}
                  </li>
                ))}
              </ul>
              {isCurrent ? null : (
                <Button
                  variant={PLANS.indexOf(plan) > PLANS.indexOf(current) ? 'primary' : 'secondary'}
                  disabled={!isOwner}
                  title={isOwner ? undefined : t('common.ownerOnly')}
                  busy={busy === plan}
                  onClick={() => choose(plan)}
                >
                  {t('plan.choose', { plan: NAME[plan] })}
                </Button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
