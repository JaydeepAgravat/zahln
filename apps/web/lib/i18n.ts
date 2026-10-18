import 'server-only';
import { cookies } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from './i18n-messages';

export * from './i18n-messages';

/** Server components: the locale from the cookie (German by default: these are German merchants). */
export async function serverLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return value === 'en' ? 'en' : 'de';
}
