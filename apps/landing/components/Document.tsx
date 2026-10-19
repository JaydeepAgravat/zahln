import type { ReactNode } from 'react';
import { fontVariables } from '@/lib/fonts';
import { tokenStyle } from '@/lib/tokens';

/**
 * Runs before first paint: marks JS as available, restores the visitor's pause-motion choice, and decides
 * whether the desktop index starts inside the intro frame (the frame-to-index morph). Kept tiny and inline.
 */
const bootScript = `(function(){var d=document.documentElement;d.classList.add('js');var p=null;try{p=localStorage.getItem('zaster.landing.motion')}catch(e){}if(p==='paused')d.setAttribute('data-motion','paused');var rm=matchMedia('(prefers-reduced-motion: reduce)').matches;if(!rm&&p!=='paused'&&matchMedia('(min-width: 1024px)').matches&&scrollY<innerHeight*0.3)d.classList.add('morph')})()`;

export function Document({ lang, children }: { lang: 'de' | 'en'; children: ReactNode }) {
  return (
    <html lang={lang} className={fontVariables} style={tokenStyle} suppressHydrationWarning>
      {/* biome-ignore lint/style/noHeadElement: an App Router root layout owns <head>; the rule is for pages/ */}
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: static, first-party boot script */}
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
