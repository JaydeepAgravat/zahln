import type { AppLocale } from '@zahln/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import type { AppKind } from './app';
import { storage } from './storage';

/** The app's kind, persisted once onboarding completes (doubles as the "onboarded" marker). */
export type Role = AppKind;

type Prefs = {
  locale: AppLocale;
  theme: 'system' | 'light' | 'dark';
  /** The mode chosen at onboarding, and for merchants which business this phone is the till for. */
  role: Role | null;
  merchantId: string | null;
  biometricsEnabled: boolean;
  /** First name only, for the lock screen greeting. Not a secret; no balances or IDs here. */
  firstName: string | null;
  setFirstName: (name: string | null) => void;
  setLocale: (locale: AppLocale) => void;
  setTheme: (theme: Prefs['theme']) => void;
  setRole: (role: Role | null, merchantId?: string | null) => void;
  setBiometricsEnabled: (enabled: boolean) => void;
  reset: () => void;
};

const mmkvStorage: StateStorage = {
  getItem: (key) => storage.getString(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => {
    storage.remove(key);
  },
};

const defaults = {
  locale: 'de' as const,
  theme: 'system' as const,
  role: null,
  merchantId: null,
  biometricsEnabled: false,
  firstName: null,
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      ...defaults,
      setFirstName: (firstName) => set({ firstName }),
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setRole: (role, merchantId = null) => set({ role, merchantId }),
      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
      reset: () => set(defaults),
    }),
    { name: 'prefs', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
