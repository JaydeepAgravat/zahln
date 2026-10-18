import type { Membership, User } from '@zahln/shared';
import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';
import { setAuth } from './api';
import { usePrefs } from './prefs';
import { clearAll, readSession, type StoredSession } from './secure';

/** How long the app may sit in the background before it asks for Face ID / PIN again. */
export const LOCK_AFTER_BACKGROUND_MS = 60_000;

type Status = 'booting' | 'onboarding' | 'locked' | 'ready';

type SessionState = {
  status: Status;
  deviceId: string | null;
  user: User | null;
  memberships: Membership[];
  backgroundedAt: number | null;
  boot: (deviceId: string) => Promise<void>;
  /** Called after a successful PIN or biometric unlock. */
  unlock: () => Promise<void>;
  lock: () => void;
  completeOnboarding: (session: StoredSession, user: User, memberships: Membership[]) => void;
  setProfile: (user: User, memberships: Membership[]) => void;
  signOut: () => Promise<void>;
};

export const useSession = create<SessionState>()((set, get) => ({
  status: 'booting',
  deviceId: null,
  user: null,
  memberships: [],
  backgroundedAt: null,

  boot: async (deviceId) => {
    const hasSession = (await readSession()) !== null && usePrefs.getState().role !== null;
    // A cold start with a session always starts locked.
    set({ deviceId, status: hasSession ? 'locked' : 'onboarding' });
  },

  unlock: async () => {
    const stored = await readSession();
    const { deviceId } = get();
    if (!stored || !deviceId) {
      set({ status: 'onboarding' });
      return;
    }
    setAuth({ token: stored.token, deviceId });
    set({ status: 'ready', backgroundedAt: null });
  },

  lock: () => {
    setAuth(null);
    set({ status: 'locked' });
  },

  completeOnboarding: (session, user, memberships) => {
    const { deviceId } = get();
    if (deviceId) setAuth({ token: session.token, deviceId });
    set({ status: 'ready', user, memberships });
  },

  setProfile: (user, memberships) => set({ user, memberships }),

  signOut: async () => {
    setAuth(null);
    await clearAll();
    usePrefs.getState().reset();
    set({ status: 'onboarding', user: null, memberships: [] });
  },
}));

/**
 * Background lock: an app switch must not become a hole. Leaving the app for more than
 * LOCK_AFTER_BACKGROUND_MS requires a fresh unlock when coming back.
 */
export function startAutoLock(now: () => number = Date.now) {
  const onChange = (next: AppStateStatus) => {
    const state = useSession.getState();
    if (state.status !== 'ready') return;
    if (next === 'background') useSession.setState({ backgroundedAt: now() });
    if (next === 'active' && state.backgroundedAt !== null) {
      if (now() - state.backgroundedAt >= LOCK_AFTER_BACKGROUND_MS) state.lock();
      else useSession.setState({ backgroundedAt: null });
    }
  };
  const sub = AppState.addEventListener('change', onChange);
  return () => sub.remove();
}
