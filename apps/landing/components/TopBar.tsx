import type { Copy } from '@/content/types';
import { Mark } from './Mark';
import { MotionPause } from './MotionPause';

/**
 * Fixed top bar. Without JS it is a translucent ink bar that reads on art and paper alike; with JS the runtime
 * sets data-nav="art" | "paper" from the section underneath (data-nav-style), and it turns solid over paper.
 * The chapter menu is <details>, so it works without JS too.
 */
export function TopBar({ copy }: { copy: Copy }) {
  return (
    <div className="topbar fixed inset-x-0 top-0 z-50" data-topbar="" data-nav="art">
      <div className="flex h-16 items-center gap-2 px-3 sm:gap-3 sm:px-6">
        <a href="#top" className="flex items-center gap-3" aria-label={copy.nav.home}>
          <Mark className="h-8 w-8 shrink-0" />
          <span
            className="hidden font-display text-[13px] font-bold tracking-[0.04em] sm:inline"
            aria-hidden="true"
          >
            {copy.nav.edition}
          </span>
        </a>

        <details className="chapter-menu relative ml-1" data-chapter-menu="">
          <summary className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-3 font-display text-[13px] font-bold hover:bg-current/10">
            {copy.nav.chapters}
            <svg viewBox="0 0 12 12" className="chev h-3 w-3 transition-transform" aria-hidden="true">
              <path
                d="M2.5 4.5L6 8l3.5-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </summary>
          <div className="absolute top-11 left-0 w-64 rounded-[6px] bg-paper p-2 text-ink shadow-[0_20px_50px_-20px_rgba(0,0,0,.55)]">
            <ol>
              {copy.chapters.map((c) => (
                <li key={c.id}>
                  <a
                    href={`#${c.id}`}
                    data-index-link={c.id}
                    className="flex items-baseline gap-3 rounded-[4px] px-3 py-2 font-display text-[15px] font-bold hover:bg-paper-muted"
                  >
                    <span className="w-9 font-serif font-normal text-text-3">{c.numeral}</span>
                    {c.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </details>

        <div className="ml-auto flex items-center gap-2">
          <MotionPause pause={copy.nav.pause} play={copy.nav.play} />
          <a
            href={copy.nav.switchHref}
            hrefLang={copy.nav.switchHrefLang}
            lang={copy.nav.switchHrefLang}
            className="inline-flex h-9 items-center rounded-full px-3 font-display text-[13px] font-bold hover:bg-current/10"
          >
            <span className="sr-only">{copy.nav.switchLabel}</span>
            <span aria-hidden="true">{copy.nav.switchShort}</span>
          </a>
          <a
            href="#plaene"
            className="hidden h-9 items-center rounded-full bg-ember px-4 font-display text-[13px] font-bold whitespace-nowrap text-on-ember min-[420px]:inline-flex transition-transform hover:scale-[1.03]"
          >
            {copy.nav.cta}
          </a>
        </div>
      </div>
    </div>
  );
}
