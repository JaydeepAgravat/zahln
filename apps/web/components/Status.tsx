'use client';

import type { IntentStatus } from '@zahln/shared';
import { StatusBadge } from '@zahln/web-ui';
import { useT } from './I18n';

export function Status({ status }: { status: IntentStatus }) {
  const { t } = useT();
  return <StatusBadge status={status} label={t(`status.${status}`)} />;
}
