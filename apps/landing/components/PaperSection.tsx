import type { Chapter, Copy, Feature } from '@/content/types';
import { Media } from './Media';
import { TornEdge } from './TornEdge';

const WIDE = new Set(['plans', 'code', 'timeline', 'status', 'ledger', 'states', 'stat']);

/**
 * Reading mode: cream paper slides over the art with a torn-receipt edge (and tears away again at the bottom).
 * Features are deep-linkable <article id>s on a 12-column grid: media articles first, text-only ones as a dense
 * two-column list.
 */
export function PaperSection({ chapter, copy, variant }: { chapter: Chapter; copy: Copy; variant: number }) {
  const withMedia = chapter.features.filter((f) => f.media.kind !== 'none');
  const textOnly = chapter.features.filter((f) => f.media.kind === 'none');
  return (
    <div className="paper on-paper" data-nav-style="paper" data-paper="">
      <TornEdge variant={variant} side="top" />
      <div className="paper-body relative mx-auto max-w-[1440px] px-5 pt-16 pb-24 sm:px-10 lg:pr-12 lg:pl-[272px]">
        <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-12">
          {withMedia.map((f) => (
            <FeatureArticle key={f.id} feature={f} copy={copy} wide={WIDE.has(f.media.kind)} />
          ))}
        </div>
        {textOnly.length > 0 ? (
          <div className="mt-16 grid gap-x-10 gap-y-8 border-t border-line-strong/50 pt-10 md:grid-cols-2">
            {textOnly.map((f) => (
              <FeatureText key={f.id} feature={f} />
            ))}
          </div>
        ) : null}
      </div>
      <TornEdge variant={variant + 1} side="bottom" />
    </div>
  );
}

function FeatureArticle({ feature, copy, wide }: { feature: Feature; copy: Copy; wide: boolean }) {
  const kind = feature.media.kind;
  if (kind === 'plans') {
    return (
      <article id={feature.id} className="md:col-span-12" data-reveal="">
        <Header feature={feature} />
        <div className="mt-10">
          <Media media={feature.media} copy={copy} />
        </div>
      </article>
    );
  }
  if (wide) {
    return (
      <article
        id={feature.id}
        className="grid gap-8 md:col-span-12 md:grid-cols-12 md:items-center"
        data-reveal=""
      >
        <div className="md:col-span-5">
          <Header feature={feature} />
        </div>
        <div className="md:col-span-7">
          <Media media={feature.media} copy={copy} />
        </div>
      </article>
    );
  }
  return (
    <article id={feature.id} className="flex flex-col md:col-span-6 xl:col-span-4" data-reveal="">
      <div className="mb-8 flex justify-center rounded-[4px] bg-paper-muted/70 px-6 pt-10 pb-0 [&_.device]:-mb-6">
        <Media media={feature.media} copy={copy} />
      </div>
      <div className="mt-6">
        <Header feature={feature} />
      </div>
    </article>
  );
}

function Header({ feature }: { feature: Feature }) {
  return (
    <>
      <h3 className="flex flex-wrap items-center gap-2 font-display text-[15px] font-bold tracking-tight">
        {feature.label}
        {feature.soon ? (
          <span className="rounded-full border border-ember-text px-2 py-px text-[11px] font-bold tracking-wide text-ember-text uppercase">
            {feature.soon}
          </span>
        ) : null}
      </h3>
      <p className="mt-2 max-w-prose font-serif text-[1.35rem] leading-snug">{feature.blurb}</p>
      {feature.link ? (
        <a
          href={feature.link.href}
          className="mt-4 inline-flex items-center gap-1 rounded-full border border-ink/25 px-3 py-1 font-display text-[13px] font-bold transition-colors hover:border-ink hover:bg-ink hover:text-on-ink"
        >
          {feature.link.label} <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </>
  );
}

function FeatureText({ feature }: { feature: Feature }) {
  return (
    <article id={feature.id} data-reveal="">
      <Header feature={feature} />
    </article>
  );
}
