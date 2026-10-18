'use client';

import { Button } from '@zahln/web-ui';

export function PrintButton({ label }: { label: string }) {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      {label}
    </Button>
  );
}
