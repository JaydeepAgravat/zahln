import { lettering } from '@/lib/lettering.gen';

/**
 * "Die Zaster Edition" as our own lettering: Inter Tight 800 converted to paths (scripts/letter-title.mjs) plus a
 * hand-drawn ember swash that runs out of the Z's base under the rest of the word.
 * Decorative: the <h1> around it carries the real text in an sr-only span.
 */
export function Lettering({ lang, className = '' }: { lang: 'de' | 'en'; className?: string }) {
  const l = lettering[lang];
  const { x1, y2 } = l.z;
  // Leaves the Z's base stroke, runs under "aster" and lifts off to the right like a pen leaving the paper.
  const y = y2 + 9;
  const swash = `M${x1 + 4} ${y - 6} C ${x1 + 30} ${y + 4}, ${x1 + 120} ${y + 6}, ${x1 + 200} ${y - 1} S ${x1 + 282} ${y - 18}, ${x1 + 298} ${y - 34}`;
  return (
    <svg viewBox={l.viewBox} className={className} aria-hidden="true" focusable="false" overflow="visible">
      {l.words.map((w) => (
        <path key={w.text} className="letter-word" d={w.d} fill="var(--z-on-ink)" />
      ))}
      <path
        className="swash"
        d={swash}
        pathLength={1}
        fill="none"
        stroke="var(--z-ember)"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
