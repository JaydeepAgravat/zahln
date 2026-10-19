import {
  bundledDefaults,
  type Feature,
  type KillSwitch,
  PLAN_FEATURES,
  type RemoteConfig,
  RemoteConfigSchema,
  updateStatus,
} from '@zaster/shared';
import { AppState } from 'react-native';
import EventSource from 'react-native-sse';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { api, apiUrl, authHeaders } from './api';
import { appKind, appVersion } from './app';
import { logger } from './logger';
import { usePrefs } from './prefs';
import { useSession } from './session';
import { storage } from './storage';

/**
 * Server-driven config on the device.
 *
 * Never blocks the start: the app renders from the cached config (or the conservative defaults bundled
 * in the binary) and updates when the server answers. Refreshed on launch, on every return to the
 * foreground, and when the server nudges over SSE, so a switch flipped in the console lands in ~1 s.
 */
type ConfigState = {
  /** Last config the server sent (persisted); null until the first answer ever. */
  config: RemoteConfig | null;
  /** The last fetch failed: the app is running on cached or bundled config. */
  offline: boolean;
  set: (patch: Partial<Pick<ConfigState, 'config' | 'offline'>>) => void;
};

const mmkv: StateStorage = {
  getItem: (k) => storage.getString(k) ?? null,
  setItem: (k, v) => storage.set(k, v),
  removeItem: (k) => {
    storage.remove(k);
  },
};

export const useConfigStore = create<ConfigState>()(
  persist((set) => ({ config: null, offline: false, set: (patch) => set(patch) }), {
    name: 'remote-config',
    storage: createJSONStorage(() => mmkv),
    partialize: (s) => ({ config: s.config }),
  }),
);

/** Cached config if we have one, else the bundled defaults. Never throws, never waits. */
export function currentConfig(): RemoteConfig {
  return useConfigStore.getState().config ?? bundledDefaults(appKind());
}

export function useRemoteConfig(): RemoteConfig {
  const config = useConfigStore((s) => s.config);
  return config ?? bundledDefaults(appKind());
}

export function useConfigOffline(): boolean {
  return useConfigStore((s) => s.offline);
}

/** True when the on-call engineer has switched this feature off. */
export function useKillSwitch(name: KillSwitch): boolean {
  return useRemoteConfig().killSwitches[name];
}

/**
 * Whether the merchant's plan includes a feature. The server's answer wins; before the first answer
 * we fall back to the plan from the membership (the last known plan), never to "everything".
 */
export function useFeature(feature: Feature, fallbackPlan?: keyof typeof PLAN_FEATURES | null): boolean {
  const config = useRemoteConfig();
  if (config.plan) return config.features.includes(feature);
  return fallbackPlan ? PLAN_FEATURES[fallbackPlan].includes(feature) : false;
}

export function useUpdateStatus() {
  return updateStatus(appVersion(), useRemoteConfig());
}

let inFlight: Promise<void> | null = null;

export function refreshConfig(): Promise<void> {
  inFlight ??= (async () => {
    try {
      const merchantId = usePrefs.getState().merchantId;
      const config = await api(
        `/config${merchantId ? `?merchantId=${encodeURIComponent(merchantId)}` : ''}`,
        RemoteConfigSchema,
        {
          timeoutMs: 5000,
        },
      );
      useConfigStore.getState().set({ config, offline: false });
    } catch (err) {
      logger.info('config fetch failed, using the saved config', err);
      useConfigStore.getState().set({ offline: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Start keeping the config fresh. Returns a cleanup. */
export function startRemoteConfig(): () => void {
  void refreshConfig();
  const appState = AppState.addEventListener('change', (s) => s === 'active' && void refreshConfig());
  // Signing in changes the answer (a till learns its plan): refetch then too.
  const offSession = useSession.subscribe((s, prev) => {
    if (s.status === 'ready' && prev.status !== 'ready') void refreshConfig();
  });
  const source = new EventSource<'config'>(`${apiUrl()}/config/events`, {
    headers: authHeaders(),
    pollingInterval: 5000,
  });
  source.addEventListener('config', () => void refreshConfig());
  return () => {
    appState.remove();
    offSession();
    source.removeAllEventListeners();
    source.close();
  };
}
