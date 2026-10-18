'use client';

import { createContext, type ReactNode, useContext, useMemo } from 'react';
import { type Locale, messages, type T, translator } from '@/lib/i18n-messages';

const Ctx = createContext<{ locale: Locale; t: T }>({ locale: 'de', t: translator('de') });

/** The server picks the locale (cookie); client components read it from here, so both render the same text. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: translator(locale) }), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useT = () => useContext(Ctx);
export { messages };
