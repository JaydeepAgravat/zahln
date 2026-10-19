'use client';

import { useState } from 'react';
import { useT } from '@/components/I18n';
import { useStepUp } from '@/components/StepUp';
import { useToast } from '@/components/Toast';
import { API_URL, ApiError } from '@/lib/client';

/** Data export needs a fresh code, so it's a fetch (which can be stepped up) rather than a plain link. */
export function ExportButton() {
  const { t } = useT();
  const stepUp = useStepUp();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const blob = await stepUp(async () => {
            const res = await fetch(`${API_URL}/web/wallet/export.json`, { credentials: 'include' });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new ApiError(res.status, body?.error ?? 'error', body?.message ?? res.statusText);
            }
            return res.blob();
          });
          const url = URL.createObjectURL(blob);
          Object.assign(document.createElement('a'), { href: url, download: 'zaster-daten.json' }).click();
          URL.revokeObjectURL(url);
        } catch (e) {
          if (!(e instanceof ApiError && e.code === 'cancelled'))
            toast(t('common.error', { message: e instanceof Error ? e.message : String(e) }), 'error');
        } finally {
          setBusy(false);
        }
      }}
      className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4 text-left hover:bg-surface-muted/60 disabled:opacity-60"
    >
      <span className="font-semibold">{t('wallet.export')} ↓</span>
      <span className="text-footnote text-text-tertiary">{t('wallet.exportSub')}</span>
    </button>
  );
}
