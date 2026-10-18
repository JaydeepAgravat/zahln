import type { AppLocale } from '@zahln/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { storage } from './storage';

export type Role = 'consumer' | 'merchant';

type Prefs = {
  locale: AppLocale;
  theme: 'system' | 'light' | 'dark';
  /** The mode chosen at onboarding, and for merchants which business this phone is the till for. */
  role: Role | null;
  merchantId: string | null;
  biometricsEnabled: boolean;
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
};

export const usePrefs = create<Prefs>()(
  persist(
    (set) => ({
      ...defaults,
      setLocale: (locale) => set({ locale }),
      setTheme: (theme) => set({ theme }),
      setRole: (role, merchantId = null) => set({ role, merchantId }),
      setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
      reset: () => set(defaults),
    }),
    { name: 'prefs', storage: createJSONStorage(() => mmkvStorage) },
  ),
);
