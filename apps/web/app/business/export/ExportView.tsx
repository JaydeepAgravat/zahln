'use client';

import { Card, Field, Input } from '@zaster/web-ui';
import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/components/I18n';
import { API_URL } from '@/lib/client';
import { berlinDate } from '@/lib/format';

export function ExportView({ allowed }: { allowed: boolean }) {
  const { t } = useT();
  const today = berlinDate();
  const [from, setFrom] = useState(`${today.slice(0, 8)}01`);
  const [to, setTo] = useState(today);
  const valid = from <= to;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold tracking-tight">{t('export.title')}</h1>
        <p className="max-w-xl text-callout text-text-secondary">{t('export.sub')}</p>
      </div>
      <Card>
        {allowed ? (
          <div className="flex flex-wrap items-end gap-4 px-5 py-5">
            <Field label={t('tx.from')}>
              {(id) => (
                <Input id={id} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
              )}
            </Field>
            <Field label={t('tx.to')}>
              {(id) => (
                <Input id={id} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
              )}
            </Field>
            {/* A plain GET: the browser sends the session cookie itself and saves the file. */}
            <a
              href={
                valid ? `${API_URL}/web/business/export.csv?${new URLSearchParams({ from, to })}` : undefined
              }
              aria-disabled={!valid}
              className="inline-flex h-10 items-center rounded-sm bg-text-primary px-4 text-callout font-medium text-bg hover:bg-text-primary/85 aria-disabled:opacity-50"
            >
              {t('export.download')}
            </a>
          </div>
        ) : (
          <p className="px-5 py-5 text-callout text-text-secondary">
            {t('export.needsBusiness')}{' '}
            <Link href="/business/plan" className="font-medium text-brand-text underline underline-offset-2">
              {t('nav.plan')} →
            </Link>
          </p>
        )}
      </Card>
    </div>
  );
}
