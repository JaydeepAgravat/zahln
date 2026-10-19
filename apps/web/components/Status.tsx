'use client';

import type { IntentStatus } from '@zaster/shared';
import { StatusBadge } from '@zaster/web-ui';
import { useT } from './I18n';

export function Status({ status }: { status: IntentStatus }) {
  const { t } = useT();
  return <StatusBadge status={status} label={t(`status.${status}`)} />;
}
