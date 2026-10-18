import type { Copy } from '@/content/types';
import type { ArtKey } from './ArtPicture';
import { ChapterHero } from './ChapterHero';
import { Choreography } from './Choreography';
import { Closing, Footer } from './Closing';
import { Intro } from './Intro';
import { PaperSection } from './PaperSection';
import { TopBar } from './TopBar';

/** The whole page. Server-rendered to static HTML; the only client pieces are small islands. */
export function Edition({ copy }: { copy: Copy }) {
  return (
    <>
      <a
        href="#main"
        className="fixed top-3 left-3 z-[60] -translate-y-24 rounded-full bg-ember px-4 py-2 font-display text-sm font-bold text-on-ember focus:translate-y-0"
      >
        {copy.skip}
      </a>
      <TopBar copy={copy} />
      <Intro copy={copy} />
      <main id="main" tabIndex={-1} className="overflow-x-clip outline-none">
        {copy.chapters.map((chapter, i) => (
          <section
            key={chapter.id}
            id={chapter.id}
            aria-labelledby={`${chapter.id}-title`}
            data-chapter={chapter.id}
          >
            <div data-nav-style="art">
              <ChapterHero chapter={chapter} art={chapter.id as ArtKey} copy={copy} />
            </div>
            <PaperSection chapter={chapter} copy={copy} variant={i} />
          </section>
        ))}
        <Closing copy={copy} />
      </main>
      <Footer copy={copy} />
      <Choreography />
    </>
  );
}
