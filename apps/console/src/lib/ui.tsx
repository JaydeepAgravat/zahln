import { Button, Dialog, Field, Textarea } from '@zahln/web-ui';
import { type ReactNode, useState } from 'react';
import { ApiError } from './api';

export const errorText = (e: unknown) =>
  e instanceof ApiError
    ? `${e.message} (${e.code})`
    : e instanceof Error
      ? e.message
      : 'Something went wrong';

/**
 * Every write in the console goes through this: say what will happen, write down why, confirm.
 * The reason lands in the audit log next to the operator's name.
 */
export function ReasonDialog({
  open,
  onClose,
  title,
  children,
  confirm,
  danger,
  suggestions = [],
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  confirm: string;
  danger?: boolean;
  suggestions?: string[];
  onConfirm: (reason: string) => Promise<unknown>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setReason('');
    setError(null);
    onClose();
  };
  const ok = reason.trim().length >= 3;

  return (
    <Dialog open={open} onClose={close} title={title}>
      <form
        className="flex flex-col gap-5"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!ok) return;
          setBusy(true);
          setError(null);
          try {
            await onConfirm(reason.trim());
            close();
          } catch (err) {
            setError(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      >
        {children ? <div className="text-callout text-text-secondary">{children}</div> : null}
        <Field label="Reason (goes in the audit log)" error={error}>
          {(id) => (
            <Textarea
              id={id}
              autoFocus
              value={reason}
              maxLength={200}
              placeholder="Why are you doing this?"
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </Field>
        {suggestions.length ? (
          <div className="-mt-2 flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setReason(s)}
                className="rounded-full border border-border px-2.5 py-1 text-caption text-text-secondary hover:bg-surface-muted"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={!ok} busy={busy}>
            {confirm}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function PageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-title font-bold tracking-tight">{title}</h1>
        {sub ? <p className="text-callout text-text-secondary">{sub}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

/** Monospace ID, shortened, copied on click. */
export function Id({ value, short = 8 }: { value: string; short?: number }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={`${value} (click to copy)`}
      onClick={(e) => {
        e.stopPropagation();
        void navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="font-mono text-footnote text-text-secondary hover:text-text-primary"
    >
      {copied ? 'copied' : value.slice(0, short)}
    </button>
  );
}
