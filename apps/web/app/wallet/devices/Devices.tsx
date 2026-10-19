'use client';

import { Button } from '@zaster/web-ui';
import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/components/I18n';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { ApiError, api } from '@/lib/client';
import { dateTime } from '@/lib/format';
import type { Device } from '@/lib/types';

export function Devices({ initial }: { initial: Device[] }) {
  const { t, locale } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const [devices, setDevices] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/wallet" className="text-footnote text-text-secondary hover:text-text-primary">
        {t('wallet.back')}
      </Link>
      <div>
        <h1 className="text-title font-bold tracking-tight">{t('wallet.devices')}</h1>
        <p className="text-callout text-text-secondary">{t('wallet.devicesSub')}</p>
      </div>
      {devices.length === 0 ? (
        <p className="text-callout text-text-tertiary">{t('wallet.noDevices')}</p>
      ) : (
        <ul className="rounded-md border border-border bg-surface">
          {devices.map((d) => (
            <li
              key={d.id}
              className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
            >
              <span className="flex flex-col">
                <span className="font-medium">{d.platform === 'ios' ? 'iPhone' : 'Android'}</span>
                <span className="text-caption text-text-tertiary">
                  {t('wallet.lastSeen', { date: dateTime(d.lastSeenAt, locale) })}
                </span>
              </span>
              <Button
                size="sm"
                variant="danger"
                busy={busy === d.id}
                onClick={async () => {
                  setBusy(d.id);
                  try {
                    await stepUp(() => api('DELETE', `/web/wallet/devices/${d.id}`));
                    setDevices((all) => all.filter((x) => x.id !== d.id));
                    toast(t('wallet.revoked'));
                  } catch (e) {
                    if (!(e instanceof ApiError && e.code === 'cancelled'))
                      toast(
                        t('common.error', { message: e instanceof Error ? e.message : String(e) }),
                        'error',
                      );
                  } finally {
                    setBusy(null);
                  }
                }}
              >
                {t('wallet.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
