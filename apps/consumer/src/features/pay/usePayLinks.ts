import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { parseHandleUrl, parsePayUrl } from '@zaster/shared';
import { useEffect } from 'react';
import { Linking } from 'react-native';
import type { HomeStackParamList } from '../../app/navigation/types';

/**
 * Links can arrive while the app is locked (or before anyone is signed in). They wait here, at module level,
 * from app start, and are only acted on once the unlocked stack mounts and asks for them.
 */
let pending: string | null = null;
let deliver: ((url: string) => void) | null = null;
let coldStart: Promise<void> = Promise.resolve();
let started = false;

/** Called once at app start (App.tsx), before any screen: Metro's inline requires would otherwise load this late. */
export function startPayLinkBuffer() {
  if (started) return;
  started = true;
  coldStart = Linking.getInitialURL().then((url) => {
    if (url) pending = url;
  });
  Linking.addEventListener('url', ({ url }) => {
    if (deliver) deliver(url);
    else pending = url;
  });
}

/**
 * Pay links (`https://pay.zaster.de/i/<ref>`, `zaster://i/<ref>`, `…/@handle`) from a browser, a message or the
 * web checkout's "In der App öffnen". This runs inside the signed-in, unlocked stack only, so a link can never
 * skip the PIN. The link is only a reference: the Pay screen fetches merchant and amount from the server.
 */
export function usePayLinks() {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
  useEffect(() => {
    const open = (url: string) => {
      const intent = parsePayUrl(url);
      if (intent) return navigation.navigate('Pay', { ref: intent.ref });
      const handle = parseHandleUrl(url);
      if (handle) navigation.navigate('Handle', { handle });
    };
    deliver = open;
    void coldStart.then(() => {
      if (pending && deliver === open) {
        const url = pending;
        pending = null;
        open(url);
      }
    });
    return () => {
      if (deliver === open) deliver = null;
    };
  }, [navigation]);
}
