import { QueryClient, useQuery } from '@tanstack/react-query';
import { MeResponseSchema, WalletSchema } from '@zaster/shared';
import { useEffect } from 'react';
import { api } from './api';
import { usePrefs } from './prefs';
import { useSession } from './session';

export const queryClient = new QueryClient({
  defaultOptions: {
    // Money screens show server truth: refetch on focus, never trust a stale cache for long.
    queries: { staleTime: 5_000, retry: 1 },
    // Never auto-retry mutations: a retried payment could charge twice. Retries are explicit, with the same key.
    mutations: { retry: 0 },
  },
});

export function useMe() {
  const setProfile = useSession((s) => s.setProfile);
  const setFirstName = usePrefs((s) => s.setFirstName);
  const query = useQuery({ queryKey: ['me'], queryFn: () => api('/me', MeResponseSchema) });
  useEffect(() => {
    if (!query.data) return;
    setProfile(query.data.user, query.data.memberships);
    setFirstName(query.data.user.name.split(' ')[0] ?? null);
  }, [query.data, setProfile, setFirstName]);
  return query;
}

/** The wallet with its most recent transactions; history asks for more. */
export function useWallet(limit = 20) {
  return useQuery({
    queryKey: ['wallet', 'me', limit],
    queryFn: () => api(`/wallets/me?limit=${limit}`, WalletSchema),
  });
}

export function useMerchantWallet() {
  const merchantId = usePrefs((s) => s.merchantId);
  return useQuery({
    queryKey: ['wallet', 'merchant', merchantId],
    queryFn: () => api(`/merchants/${merchantId}/wallet`, WalletSchema),
    enabled: !!merchantId,
  });
}
