'use client';

// Interactive primitives (hooks inside). In Next.js, server components can still render them;
// they just hydrate on the client. Vite (the console) ignores the directive.
import { type Cents, formatMoney, type IntentStatus } from '@zahln/shared';
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from 'react';

export { themeCss } from './themeCss';

/** Joins class names, skipping falsy ones. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

// ---------- Formatting ----------

/** Amounts are always German-formatted (6,30 €) and tabular, so columns line up. */
export const money = (cents: Cents) => formatMoney(cents, 'de');

const dateTime = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  timeZone: 'Europe/Berlin',
});
export const when = (iso: string) => dateTime.format(new Date(iso));

/** "12 s ago", "4 min ago", then the timestamp. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.round((now - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.max(s, 0)} s ago`;
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  return when(iso);
}

// ---------- Primitives ----------

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-text-primary text-bg hover:bg-text-primary/85',
  secondary: 'border border-border bg-surface text-text-primary hover:bg-surface-muted',
  ghost: 'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
  danger: 'bg-danger text-on-flood hover:bg-danger/90',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  busy,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; busy?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        'disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-footnote' : 'h-10 px-4 text-callout',
        variants[variant],
        className,
      )}
    >
      {busy ? <Spinner /> : null}
      {children}
    </button>
  );
}

const field =
  'rounded-sm border border-border bg-surface px-3 text-callout text-text-primary placeholder:text-text-tertiary ' +
  'focus:border-text-primary focus:outline-none disabled:opacity-60';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...rest} className={cx(field, 'h-10 w-full', className)} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...rest} className={cx(field, 'min-h-20 w-full py-2', className)} />;
}

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...rest} className={cx(field, 'h-10 pr-8', className)} />;
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  children: (id: string) => ReactNode;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-footnote font-medium text-text-secondary">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p role="alert" className="text-footnote text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-footnote text-text-tertiary">{hint}</p>
      ) : null}
    </div>
  );
}

export function Card({
  title,
  actions,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx('rounded-md border border-border bg-surface', className)}>
      {title ? (
        <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
          <h2 className="text-callout font-semibold">{title}</h2>
          {actions}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand';
const tones: Record<Tone, string> = {
  neutral: 'bg-pending-subtle text-pending',
  success: 'bg-success-subtle text-success',
  warning: 'bg-warning-subtle text-warning',
  danger: 'bg-danger-subtle text-danger',
  info: 'bg-info-subtle text-info',
  brand: 'bg-brand-subtle text-brand-text',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption whitespace-nowrap',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

const STATUS: Record<IntentStatus, { label: string; tone: Tone }> = {
  awaiting_scan: { label: 'Awaiting scan', tone: 'neutral' },
  scanned: { label: 'Customer checking', tone: 'info' },
  paid: { label: 'Paid', tone: 'success' },
  expired: { label: 'Expired', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  partially_refunded: { label: 'Part refunded', tone: 'warning' },
  refunded: { label: 'Refunded', tone: 'warning' },
};
export const statusLabel = (s: IntentStatus) => STATUS[s].label;

/** `label` lets a localised app (Zahln Web is German first) name the status; the tone stays the same everywhere. */
export function StatusBadge({ status, label: given }: { status: IntentStatus; label?: string }) {
  const { label: fallback, tone } = STATUS[status];
  const label = given ?? fallback;
  return (
    <Badge tone={tone}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        'size-4 animate-spin rounded-full border-2 border-current border-r-transparent',
        className,
      )}
    />
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-14 text-center">
      <p className="text-callout font-semibold">{title}</p>
      {children ? <p className="max-w-sm text-footnote text-text-tertiary">{children}</p> : null}
    </div>
  );
}

/** Keyboard switch with a visible state; `danger` colours "on" red (a kill switch that is on means a feature is off). */
export function Switch({
  checked,
  onChange,
  label,
  danger,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        checked ? (danger ? 'bg-danger' : 'bg-success') : 'bg-border-strong/50',
      )}
    >
      <span
        className={cx(
          'absolute top-0.5 left-0.5 size-5 rounded-full bg-surface-raised shadow-sm transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

/** A modal built on <dialog>: focus trap, Escape and the backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className={cx(
        'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-raised p-0 text-text-primary',
        'shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-[2px]',
      )}
    >
      {open ? (
        <div className="flex flex-col gap-5 p-6">
          <h2 className="text-headline font-semibold">{title}</h2>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}
