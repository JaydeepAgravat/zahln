import de from './de.json';
import en from './en.json';

export const resources = { de: { translation: de }, en: { translation: en } } as const;
export const defaultLocale = 'de' as const;
export type Messages = typeof de;
export { de, en };
