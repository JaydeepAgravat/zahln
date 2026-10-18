import type { Copy } from '@/content/types';

const STYLE = {
  free: 'bg-paper-raised text-ink border border-line',
  pro: 'bg-ember text-on-ember',
  business: 'bg-ink text-on-ink',
} as const;

/**
 * Free / Pro / Business as three receipts, fanned like cards on a counter. Static CSS fan; the runtime
 * gathers them into a stack and deals them out when they enter the viewport.
 */
export function PlanFan({ plans }: { plans: Copy['plans'] }) {
  return (
    <div>
      <h3 className="sr-only">{plans.heading}</h3>
      <ul className="plan-fan grid gap-6 md:grid-cols-3 md:gap-4" data-plan-fan="">
        {plans.items.map((p) => (
          <li
            key={p.id}
            className={`plan-card relative rounded-t-[6px] p-6 pb-10 ${STYLE[p.id]}`}
            data-plan={p.id}
          >
            {p.id === 'pro' ? (
              <p className="absolute top-5 right-5 rounded-full bg-ink px-2.5 py-0.5 font-display text-[11px] font-bold tracking-wide text-on-ink uppercase">
                {plans.recommended}
              </p>
            ) : null}
            <p className="font-display text-sm font-bold tracking-[0.14em] uppercase">{p.name}</p>
            <p className="mt-4 font-display text-6xl font-extrabold tracking-[-0.04em] tabular-nums">
              {p.price}
            </p>
            <p className="mt-1 font-serif text-lg italic opacity-90">{p.period}</p>
            <p className="mt-4 font-serif text-xl leading-snug">{p.pitch}</p>
            <ul className="mt-5 space-y-2 border-t border-dashed border-current/40 pt-4 font-sans text-[15px]">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden="true">·</span>
                  {f}
                </li>
              ))}
            </ul>
            {/* receipt zigzag */}
            <span
              aria-hidden="true"
              className="absolute right-0 -bottom-[9px] left-0 h-[10px] bg-[length:16px_10px] bg-repeat-x"
              style={{
                backgroundImage: `linear-gradient(135deg, currentColor 25%, transparent 25%), linear-gradient(225deg, currentColor 25%, transparent 25%)`,
                color:
                  p.id === 'free'
                    ? 'var(--z-paper-raised)'
                    : p.id === 'pro'
                      ? 'var(--z-ember)'
                      : 'var(--z-ink)',
              }}
            />
          </li>
        ))}
      </ul>
      <p className="mt-10 font-serif text-lg text-text-2 italic">{plans.note}</p>
    </div>
  );
}
