import { handleUrlFor } from '@zaster/shared/payUrl';
import type { Metadata } from 'next';
import { serverLocale, translator } from '@/lib/i18n';
import { qrSvg } from '@/lib/qr';
import { getSession } from '@/lib/server';
import { PrintButton } from './PrintButton';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translator(await serverLocale())('poster.title') };
}

/**
 * The static @handle QR as an A5 counter poster. Rendered on the server as SVG and printed by the browser
 * (Save as PDF works too), so there's no PDF library in the bundle.
 */
export default async function PosterPage() {
  const [session, locale] = await Promise.all([getSession(), serverLocale()]);
  const t = translator(locale);
  const merchant = session.merchant;
  if (!merchant) return null;
  const url = handleUrlFor(merchant.handle);
  const svg = await qrSvg(url);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="text-title font-bold tracking-tight">{t('poster.title')}</h1>
          <p className="max-w-xl text-callout text-text-secondary">{t('poster.sub')}</p>
        </div>
        <PrintButton label={t('poster.print')} />
      </div>
      {/* Fixed colours: a printed poster has no dark mode. */}
      <article className="poster mx-auto flex aspect-[148/210] w-full max-w-[420px] flex-col overflow-hidden rounded-md bg-[#FFFDFA] text-[#1B1A17] shadow-xl print:max-w-none print:rounded-none print:shadow-none">
        <header className="bg-[#FF4F1F] px-8 pt-8 pb-10">
          <p className="text-[2rem] leading-tight font-bold tracking-tight">{t('poster.cta')}</p>
        </header>
        <svg aria-hidden viewBox="0 0 400 10" preserveAspectRatio="none" className="-mt-px h-3 w-full">
          <path
            d={`M0 0 H400 V0 ${Array.from({ length: 40 }, (_, i) => `L${400 - i * 10 - 5} 10 L${400 - i * 10 - 10} 0`).join(' ')} Z`}
            fill="#FF4F1F"
          />
        </svg>
        <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8 py-6 text-center">
          <div
            className="w-[70%]"
            role="img"
            aria-label={url}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated on the server by the qrcode library from the merchant's own handle URL
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div>
            <p className="text-[1.5rem] font-bold">{merchant.name}</p>
            <p className="font-mono text-[0.85rem] text-[#5E574E]">@{merchant.handle}</p>
          </div>
          <p className="text-[0.9rem] text-[#5E574E]">{t('poster.hint')}</p>
        </div>
      </article>
    </div>
  );
}
