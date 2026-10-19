import { type AppLocale, formatMoney } from '@zaster/shared';
import { defaultLocale, resources } from '@zaster/shared/i18n';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import { usePrefs } from './prefs';

i18n.use(initReactI18next).init({
  resources,
  lng: usePrefs.getState().locale ?? defaultLocale,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

usePrefs.subscribe((state, prev) => {
  if (state.locale !== prev.locale) void i18n.changeLanguage(state.locale);
});

export { i18n };

/** Translation plus locale-aware money formatting, so screens never build "6,30 €" by hand. */
export function useT() {
  const { t } = useTranslation();
  const locale = usePrefs((s) => s.locale) as AppLocale;
  return { t, locale, money: (cents: number) => formatMoney(cents, locale) };
}
