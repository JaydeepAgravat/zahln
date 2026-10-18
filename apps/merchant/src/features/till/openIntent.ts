import { storage } from '@zahln/mobile-core';

/**
 * The QR the till is currently showing. If the till auto-locks (or the app restarts) while a customer
 * is paying, unlocking brings the same QR back, or the green screen if they paid meanwhile.
 * Only the ID is stored; the status always comes from the server.
 */
const KEY = 'till.openIntent';

export const openIntent = {
  set: (intentId: string) => storage.set(KEY, intentId),
  get: () => storage.getString(KEY) ?? null,
  clear: () => {
    storage.remove(KEY);
  },
};
