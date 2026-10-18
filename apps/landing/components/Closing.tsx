import type { Copy } from '@/content/types';
import { credits as allCredits } from '@/lib/credits';
import { ArtCredit, ArtPicture } from './ArtPicture';
import { Lettering } from './Lettering';

export function Closing({ copy }: { copy: Copy }) {
  return (
    <section
      aria-labelledby="closing-title"
      className="relative isolate overflow-hidden"
      data-nav-style="art"
      id="start"
    >
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <ArtPicture use="closing" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(27,26,23,.6),rgba(27,26,23,.92))]" />
        <div className="grain absolute inset-0" />
      </div>
      <div className="flex min-h-svh flex-col items-start justify-center px-5 py-32 text-on-ink sm:px-10 lg:pl-[272px]">
        <h2 id="closing-title" className="hero-title max-w-5xl font-display font-extrabold">
          {copy.closing.title}
        </h2>
        <p className="mt-6 max-w-2xl font-serif text-3xl italic sm:text-4xl">{copy.closing.line}</p>
        <div className="mt-10 flex flex-wrap items-center gap-3">
          <a
            href="#plaene"
            className="inline-flex h-14 items-center rounded-full bg-ember px-8 font-display text-lg font-bold text-on-ember transition-transform hover:scale-[1.03]"
          >
            {copy.closing.cta}
          </a>
          {[copy.closing.appStore, copy.closing.playStore].map((store) => (
            <span
              key={store}
              className="inline-flex h-14 items-center gap-2 rounded-full border border-on-ink/40 px-6 font-display text-[15px] font-bold"
            >
              {store}
              <span className="font-serif text-base font-normal text-on-ink-muted italic">
                {copy.closing.soon}
              </span>
            </span>
          ))}
        </div>
        <div className="mt-16 max-w-md">
          <ArtCredit use="closing" label={copy.art.label} />
        </div>
      </div>
    </section>
  );
}

export function Footer({ copy }: { copy: Copy }) {
  const credits = allCredits;
  return (
    <footer className="on-paper relative bg-paper text-ink" data-nav-style="paper">
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-10 lg:pl-[272px]">
        <div className="max-w-[180px] [&_.letter-word]:fill-ink">
          <Lettering lang={copy.lang} className="w-full" />
        </div>
        <h2 className="mt-12 font-display text-sm font-bold tracking-[0.14em] uppercase">
          {copy.footer.credits}
        </h2>
        <p className="mt-2 max-w-2xl font-serif text-lg text-text-2">{copy.footer.creditsIntro}</p>
        <ul className="mt-6 grid gap-x-8 gap-y-2 font-serif text-[15px] text-text-2 md:grid-cols-2">
          {credits.map((a) => (
            <li key={a.use}>
              {a.artist},{' '}
              <a href={a.objectUrl} className="underline decoration-1 underline-offset-2 hover:text-ink">
                {a.title}
              </a>
              , {a.date}. {a.collection.replace(/ \(.*\)$/, '')}, {a.licence.replace(/ \(.*\)$/, '')}.
            </li>
          ))}
        </ul>
        <p className="mt-6 font-serif text-[15px] text-text-2">{copy.footer.licence}</p>
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-6 font-serif text-[15px]">
          <a href="/impressum/" className="underline decoration-1 underline-offset-2">
            {copy.footer.impressum}
          </a>
          <a href="/datenschutz/" className="underline decoration-1 underline-offset-2">
            {copy.footer.datenschutz}
          </a>
          <span className="text-text-2">{copy.footer.note}</span>
        </div>
      </div>
    </footer>
  );
}
