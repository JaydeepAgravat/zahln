/**
 * Which app this bundle is. Zahln (consumer) and ZYSYGY (merchant) share every package;
 * the app shell calls `configureApp` once in index.js, before anything renders.
 */
export type AppKind = 'consumer' | 'merchant';

let current: AppKind | null = null;

export function configureApp(kind: AppKind) {
  current = kind;
}

export function appKind(): AppKind {
  if (!current) throw new Error('configureApp() must run before the app renders');
  return current;
}
