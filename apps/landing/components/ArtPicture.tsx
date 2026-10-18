import { art } from '@/lib/art.gen';
import { creditFor } from '@/lib/credits';

export type ArtKey = keyof typeof art;

const srcset = (slug: string, key: 'l' | 'p', widths: readonly number[], ext: string) =>
  widths.map((w) => `/art/${slug}-${key}-${w}.${ext} ${w}w`).join(', ');

/**
 * A graded painting as a responsive <picture>: 9:16 crops on portrait screens, 16:10 elsewhere, AVIF then WebP,
 * with a 16 px blurred placeholder as the background so there is never an empty box. Decorative (alt=""):
 * the credit is printed as a caption and in the footer.
 */
export function ArtPicture({
  use,
  priority = false,
  className = '',
}: {
  use: ArtKey;
  priority?: boolean;
  className?: string;
}) {
  const a = art[use];
  return (
    <picture>
      <source
        media="(max-aspect-ratio: 4/5)"
        type="image/avif"
        srcSet={srcset(a.slug, 'p', a.p.widths, 'avif')}
        sizes="100vw"
      />
      <source
        media="(max-aspect-ratio: 4/5)"
        type="image/webp"
        srcSet={srcset(a.slug, 'p', a.p.widths, 'webp')}
        sizes="100vw"
      />
      <source type="image/avif" srcSet={srcset(a.slug, 'l', a.l.widths, 'avif')} sizes="100vw" />
      <source type="image/webp" srcSet={srcset(a.slug, 'l', a.l.widths, 'webp')} sizes="100vw" />
      <img
        src={`/art/${a.slug}-l-1280.webp`}
        alt=""
        width={1280}
        height={800}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        fetchPriority={priority ? 'high' : 'low'}
        className={`h-full w-full object-cover ${className}`}
        style={{ backgroundImage: `url(${a.l.blur})`, backgroundSize: 'cover' }}
        data-parallax=""
      />
    </picture>
  );
}

export function ArtCredit({ use, label }: { use: ArtKey; label: string }) {
  const c = creditFor(use);
  return (
    <p className="font-serif text-sm leading-snug text-on-ink-muted italic">
      <span className="sr-only">{label}: </span>
      {c.artist},{' '}
      <a href={c.objectUrl} className="underline decoration-1 underline-offset-2 hover:text-on-ink">
        {c.title}
      </a>
      , {c.date}
    </p>
  );
}
