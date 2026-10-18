/** Placeholder for the legally required pages (TMG/DDG §5 Impressum, DSGVO privacy notice). Not legal text. */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <main className="min-h-svh bg-paper px-5 py-24 text-ink sm:px-10">
      <div className="mx-auto max-w-2xl">
        <p className="font-display text-xs font-bold tracking-[0.14em] text-text-3 uppercase">Platzhalter</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-6 font-serif text-xl text-text-2">
          Diese Seite ist ein Platzhalter für den Prototyp. Vor einer echten Veröffentlichung steht hier der
          rechtlich geprüfte Text.
        </p>
        <p className="mt-10">
          <a href="/" className="font-display font-bold underline underline-offset-4">
            ← Zur Edition
          </a>
        </p>
      </div>
    </main>
  );
}
