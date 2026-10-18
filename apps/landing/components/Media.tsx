import type { Copy, Media as MediaSpec } from '@/content/types';
import { DeviceFrame } from './DeviceFrame';
import { PaymentStatusDemo } from './PaymentStatusDemo';
import { PlanFan } from './PlanFan';

export function Media({ media, copy }: { media: MediaSpec; copy: Copy }) {
  switch (media.kind) {
    case 'device':
      return (
        <DeviceFrame screen={media.screen} alt={media.alt} platform={media.platform} className="mx-auto" />
      );
    case 'stat':
      return (
        <figure className="flex aspect-[4/3] flex-col justify-end rounded-[4px] bg-ink p-6 text-on-ink">
          <p className="font-display text-[clamp(4rem,9vw,7rem)] leading-none font-extrabold tracking-[-0.04em] tabular-nums">
            {media.value}
            <span className="ml-2 text-[0.4em] font-bold tracking-normal text-ember">{media.unit}</span>
          </p>
          <figcaption className="mt-3 font-serif text-lg text-on-ink-muted italic">
            {media.caption}
          </figcaption>
        </figure>
      );
    case 'timeline':
      return (
        <ol className="relative space-y-5 border-l border-line-strong pl-6">
          {media.steps.map((s, i) => (
            <li key={s.time} className="relative">
              <span
                aria-hidden="true"
                className={`absolute top-1.5 -left-[29px] h-2.5 w-2.5 rounded-full ${i === 2 ? 'bg-ember' : 'bg-ink'}`}
              />
              <p className="font-display text-xl font-bold tabular-nums">{s.time}</p>
              <p className="font-serif text-lg text-text-2">{s.text}</p>
            </li>
          ))}
        </ol>
      );
    case 'code':
      return (
        <figure className="overflow-hidden rounded-[4px] bg-ink text-on-ink">
          <figcaption className="border-b border-white/10 px-5 py-3 font-display text-xs font-bold tracking-[0.12em] text-on-ink-muted uppercase">
            {media.caption}
          </figcaption>
          {/* Wraps instead of scrolling sideways, so there is no scroll region to make focusable. */}
          <pre className="p-5 font-mono text-[12px] leading-relaxed break-all whitespace-pre-wrap sm:text-[12.5px] sm:break-normal">
            <code>{media.code}</code>
          </pre>
        </figure>
      );
    case 'ledger':
      return (
        <figure className="rounded-[4px] border border-line bg-paper-raised p-5">
          <figcaption className="mb-3 font-serif text-lg italic">{media.caption}</figcaption>
          <table className="w-full font-display text-[15px]">
            <tbody>
              {media.rows.map((r) => (
                <tr key={r.account} className="border-b border-dashed border-line-strong">
                  <th scope="row" className="py-2 text-left font-bold">
                    {r.account}
                  </th>
                  <td className="py-2 text-right tabular-nums">{r.amount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="pt-3 text-left font-serif text-lg font-normal italic">
                  Σ
                </th>
                <td className="pt-3 text-right font-extrabold tabular-nums">{media.total}</td>
              </tr>
            </tfoot>
          </table>
        </figure>
      );
    case 'states':
      return (
        <ol className="flex flex-wrap items-center gap-2 font-mono text-[13px]">
          {media.states.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 ${s === 'paid' ? 'bg-flood-paid text-on-flood' : 'bg-paper-muted'}`}
              >
                {s}
              </span>
              {i < media.states.length - 1 ? (
                <span aria-hidden="true" className="text-text-3">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      );
    case 'status':
      return <PaymentStatusDemo copy={copy.status} />;
    case 'plans':
      return <PlanFan plans={copy.plans} />;
    case 'none':
      return null;
  }
}
