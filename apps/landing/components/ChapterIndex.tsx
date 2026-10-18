import type { Copy } from '@/content/types';

/**
 * The chapter index: Roman numerals, one link per chapter (deep links to #id). One element with two states:
 * inside the intro frame, then fixed in the left column (see .chapter-index in globals.css and lib/motion.ts).
 * The runtime marks the chapter in view with aria-current.
 */
export function ChapterIndex({ copy }: { copy: Copy }) {
  return (
    <nav
      aria-label={copy.nav.index}
      className="chapter-index on-paper relative rounded-[3px] bg-paper px-4 pt-3 pb-5 text-text-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,.6)]"
      data-index=""
    >
      <p className="mb-2 font-display text-[11px] font-bold tracking-[0.14em] text-text-3 uppercase">
        {copy.intro.chaptersLabel}
      </p>
      <ol className="space-y-px">
        {copy.chapters.map((c) => (
          <li key={c.id}>
            <a
              href={`#${c.id}`}
              data-index-link={c.id}
              className="group flex items-baseline gap-2 py-[3px] font-display text-[14px] font-bold leading-5 transition-colors hover:text-ink"
            >
              <span className="w-9 shrink-0 font-serif text-[15px] font-normal text-text-3 italic tabular-nums">
                {c.numeral}
              </span>
              <span className="flex-1">{c.title}</span>
              <span
                className="idx-dot h-1.5 w-1.5 scale-0 rounded-full bg-ember transition-transform"
                aria-hidden="true"
              />
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
