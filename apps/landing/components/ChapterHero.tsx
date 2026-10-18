import type { Chapter, Copy } from '@/content/types';
import { ArtCredit, type ArtKey, ArtPicture } from './ArtPicture';

/**
 * A chapter hero: the painting holds (CSS sticky, no JS) while the giant title, the promise and the editorial
 * statement scroll past. The shader canvas, when allowed, is mounted into [data-shader-host].
 */
export function ChapterHero({ chapter, art, copy }: { chapter: Chapter; art: ArtKey; copy: Copy }) {
  return (
    <div className="hero relative" data-hero="">
      <div className="hero-art" aria-hidden="true" data-shader-host="">
        <ArtPicture use={art} />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(27,26,23,.92),rgba(27,26,23,.35)_45%,rgba(27,26,23,.55))]" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="absolute inset-0 flex flex-col text-on-ink">
        <div className="flex h-svh flex-col justify-end px-5 pb-[14svh] sm:px-10 lg:pl-[272px]">
          <p className="mb-3 font-serif text-2xl text-on-ink-muted italic sm:text-3xl" aria-hidden="true">
            {chapter.numeral}
          </p>
          <h2
            id={`${chapter.id}-title`}
            tabIndex={-1}
            className="hero-title font-display font-extrabold outline-none"
          >
            <span className="sr-only">{chapter.numeral}. </span>
            {chapter.title}
          </h2>
          <p className="mt-5 max-w-2xl font-serif text-2xl leading-tight italic sm:text-4xl">
            {chapter.promise}
          </p>
        </div>

        <div className="flex flex-1 items-center px-5 sm:px-10 lg:pl-[272px]">
          <div className="statement-block max-w-3xl" data-reveal="">
            <p className="statement font-serif text-[1.65rem] leading-[1.18] sm:text-[2.6rem]">
              {chapter.statement}
            </p>
            <div className="mt-8 max-w-md">
              <ArtCredit use={art} label={copy.art.label} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
