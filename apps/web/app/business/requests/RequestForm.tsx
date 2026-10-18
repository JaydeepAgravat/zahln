'use client';

import type { PaymentIntent } from '@zahln/shared';
import { Button, Card, Field, Input } from '@zahln/web-ui';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useT } from '@/components/I18n';
import { useToast } from '@/components/Toast';
import { api } from '@/lib/client';
import { dateTime, money } from '@/lib/format';
import { qrSvg } from '@/lib/qr';

export function RequestForm({ allowed }: { allowed: boolean }) {
  const { t, locale } = useT();
  const toast = useToast();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [made, setMade] = useState<{ intent: PaymentIntent; url: string; svg: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const key = useRef(crypto.randomUUID());
  const cents = Math.round(Number(amount.replace(',', '.')) * 100);
  const valid = Number.isInteger(cents) && cents > 0;

  if (!allowed)
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-title font-bold tracking-tight">{t('req.title')}</h1>
        <p className="text-callout text-text-secondary">
          {t('req.needsPro')}{' '}
          <Link href="/business/plan" className="font-medium text-brand-text underline underline-offset-2">
            {t('nav.plan')} →
          </Link>
        </p>
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold tracking-tight">{t('req.title')}</h1>
        <p className="max-w-xl text-callout text-text-secondary">{t('req.sub')}</p>
      </div>
      <Card>
        <form
          className="flex flex-wrap items-end gap-4 px-5 py-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const intent = await api<PaymentIntent>('POST', '/web/business/requests', {
                body: { amountCents: cents, ...(note.trim() ? { description: note.trim() } : {}) },
                key: key.current,
              });
              key.current = crypto.randomUUID();
              const url = `${window.location.origin}/i/${intent.ref}`;
              setMade({ intent, url, svg: await qrSvg(url) });
              setAmount('');
              setNote('');
            } catch (err) {
              toast(
                t('common.error', { message: err instanceof Error ? err.message : String(err) }),
                'error',
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="w-36">
            <Field label={t('req.amount')}>
              {(id) => (
                <Input
                  id={id}
                  inputMode="decimal"
                  placeholder="45,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="min-w-56 flex-1">
            <Field label={t('req.note')}>
              {(id) => (
                <Input
                  id={id}
                  maxLength={80}
                  placeholder={t('req.notePlaceholder')}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              )}
            </Field>
          </div>
          <Button type="submit" variant="primary" busy={busy} disabled={!valid}>
            {t('req.create')}
          </Button>
        </form>
      </Card>

      {made ? (
        <Card title={`${t('req.link')} · ${money(made.intent.amountCents, locale)}`}>
          <div className="flex flex-wrap items-start gap-6 px-5 py-5">
            <div
              className="size-40 shrink-0 overflow-hidden rounded-md bg-white p-1"
              role="img"
              aria-label={t('req.link')}
              // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated locally by the qrcode library from our own URL
              dangerouslySetInnerHTML={{ __html: made.svg }}
            />
            <div className="flex min-w-0 flex-1 flex-col gap-3">
              <code className="rounded-sm bg-surface-muted px-3 py-2 font-mono text-footnote break-all">
                {made.url}
              </code>
              <p className="text-footnote text-text-tertiary">
                {made.intent.description ? `${made.intent.description} · ` : ''}
                {t('req.validUntil', { date: dateTime(made.intent.expiresAt, locale).slice(0, -3) })}
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    await navigator.clipboard.writeText(made.url);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? t('req.copied') : t('req.copy')}
                </Button>
                {typeof navigator !== 'undefined' && 'share' in navigator ? (
                  <Button
                    variant="ghost"
                    onClick={() =>
                      navigator.share({ url: made.url, title: made.intent.merchant.name }).catch(() => {})
                    }
                  >
                    {t('req.share')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
