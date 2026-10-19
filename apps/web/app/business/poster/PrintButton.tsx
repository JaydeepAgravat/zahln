'use client';

import { Button } from '@zaster/web-ui';

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
