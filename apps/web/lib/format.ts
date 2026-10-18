import { type Cents, formatMoney } from '@zahln/shared';
import type { Locale } from './i18n-messages';

// Same locale and timezone on the server and in the browser, so hydration never disagrees.
const TZ = 'Europe/Berlin';
const tag = (l: Locale) => (l === 'de' ? 'de-DE' : 'en-GB');

export const money = (cents: Cents, locale: Locale = 'de') => formatMoney(cents, locale);

export const time = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(tag(locale), { hour: '2-digit', minute: '2-digit', timeZone: TZ }).format(
    new Date(iso),
  );

export const dateTime = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(tag(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: TZ,
  }).format(new Date(iso));

export const day = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(tag(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: TZ,
  }).format(new Date(iso));

/** Today's date in Berlin as YYYY-MM-DD. */
export const berlinDate = (d = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d);
