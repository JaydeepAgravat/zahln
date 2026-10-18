import type { Copy } from '@/content/types';
import { ArtCredit, ArtPicture } from './ArtPicture';
import { ChapterIndex } from './ChapterIndex';
import { Lettering } from './Lettering';

/**
 * The intro: a full-bleed painting under ink, and a portrait frame that draws itself (pathLength=1) with
 * construction lines running to the viewport edges. Inside: the title lettering, the serif line, and the
 * chapter index, which on desktop then travels to the left column.
 */
export function Intro({ copy }: { copy: Copy }) {
  return (
    <header className="relative min-h-svh overflow-x-clip" data-nav-style="art" id="top">
      <div className="absolute inset-0" aria-hidden="true" data-intro-art="">
        <ArtPicture use="intro" priority />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(27,26,23,.55),rgba(27,26,23,.9)_75%)]" />
        <div className="grain absolute inset-0" />
      </div>

      <div className="relative flex min-h-svh items-center justify-center px-5 pt-24 pb-16 lg:pt-20">
        <div className="relative w-full max-w-[380px] px-6 pt-7 pb-6 text-on-ink sm:px-8" data-frame="">
          {/* The frame and its construction lines are drawing, not content. */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <rect
              className="frame-rect"
              x="0"
              y="0"
              width="100"
              height="100"
              pathLength={1}
              fill="none"
              stroke="var(--z-on-ink)"
              strokeOpacity=".75"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
            <g
              className="construction"
              stroke="var(--z-on-ink)"
              strokeOpacity=".22"
              vectorEffect="non-scaling-stroke"
            >
              <line x1="-400" y1="0" x2="500" y2="0" vectorEffect="non-scaling-stroke" />
              <line x1="-400" y1="100" x2="500" y2="100" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="-60" x2="0" y2="160" vectorEffect="non-scaling-stroke" />
              <line x1="100" y1="-60" x2="100" y2="160" vectorEffect="non-scaling-stroke" />
            </g>
          </svg>

          <p className="intro-fade mb-5 flex items-center justify-between font-display text-[11px] font-bold tracking-[0.16em] text-on-ink-muted uppercase">
            <span>Zahln</span>
            <span>{copy.intro.season}</span>
          </p>
          <h1>
            <span className="sr-only">
              {copy.intro.title} · {copy.intro.season}
            </span>
            <Lettering lang={copy.lang} className="mx-auto block w-[78%] max-w-[250px]" />
          </h1>
          <p className="intro-fade mt-5 text-center font-serif text-[1.35rem] leading-snug italic">
            {copy.intro.line}
          </p>

          {/* Mobile: the index sits here in the flow. Desktop + motion: an empty slot it starts from. */}
          <div className="mt-6 lg:hidden">
            <ChapterIndexSlotMobile copy={copy} />
          </div>
          <div className="frame-slot mt-6 h-[318px]" aria-hidden="true" data-frame-slot="" />
        </div>
      </div>

      {/* Desktop: the same nav element, fixed. Hidden on mobile because the frame shows it inline. */}
      <div className="hidden lg:block" data-index-desktop="">
        <ChapterIndex copy={copy} />
      </div>

      <div className="absolute right-5 bottom-4 left-5 flex justify-end lg:left-auto">
        <div className="max-w-sm text-right">
          <ArtCredit use="intro" label={copy.art.label} />
        </div>
      </div>
    </header>
  );
}

/**
 * On small screens there is no fixed column, so the index is simply part of the frame. It is a separate
 * render of the same component because the desktop one lives outside the frame's layout box.
 */
function ChapterIndexSlotMobile({ copy }: { copy: Copy }) {
  return (
    <div className="[&_.chapter-index]:shadow-none" data-index-mobile="">
      <ChapterIndex copy={copy} />
    </div>
  );
}
