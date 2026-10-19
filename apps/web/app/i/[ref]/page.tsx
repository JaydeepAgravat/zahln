import type { PaymentIntent } from '@zaster/shared';
import type { Metadata } from 'next';
import { checkoutCopy } from '@/lib/checkout-copy';
import { serverLocale } from '@/lib/i18n';
import { Checkout } from './Checkout';

// Never cache a pay page: a cached "pay" button on an expired or paid intent is exactly the bug to avoid.
export const dynamic = 'force-dynamic';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

async function load(ref: string): Promise<PaymentIntent | null> {
  const res = await fetch(`${API}/public/intents/${encodeURIComponent(ref)}`, { cache: 'no-store' });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error(`public intent → ${res.status}`);
  return (await res.json()) as PaymentIntent;
}

type Props = { params: Promise<{ ref: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const intent = await load((await params).ref);
  const t = checkoutCopy(await serverLocale());
  // The merchant's name only: amounts don't belong in link previews and browser history titles.
  return { title: { absolute: intent ? t('title', { merchant: intent.merchant.name }) : t('invalid') } };
}

/**
 * The pay link: https://pay.zaster.de/i/<id>.<sig>. The URL is only a reference: the page asks the API for the
 * merchant and the amount, server-side, so the first paint is complete and nothing in the URL can change them.
 */
export default async function PayLinkPage({ params }: Props) {
  const { ref } = await params;
  const [intent, locale] = await Promise.all([load(ref), serverLocale()]);
  const t = checkoutCopy(locale);
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-6 pb-10">
      {intent ? (
        <Checkout intent={intent} locale={locale} />
      ) : (
        <section className="mt-16 flex flex-col gap-2 text-center">
          <h1 className="text-title font-bold">{t('invalid')}</h1>
          <p className="text-callout text-text-secondary">{t('invalidBody')}</p>
        </section>
      )}
    </main>
  );
}
