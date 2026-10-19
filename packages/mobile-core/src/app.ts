/**
 * Which app this bundle is, and its version. Zaster (consumer) and Zettel (merchant) share every package;
 * the app shell calls `configureApp` once in index.js, before anything renders.
 */
export type AppKind = 'consumer' | 'merchant';

let current: { kind: AppKind; version: string } | null = null;

export function configureApp(kind: AppKind, version = '0.1.0') {
  current = { kind, version };
}

export function appKind(): AppKind {
  if (!current) throw new Error('configureApp() must run before the app renders');
  return current.kind;
}

/**
 * The version the forced-update gate compares. Today it comes from the app's package.json; in a store
 * build it would be the native CFBundleShortVersionString / versionName, read at startup.
 */
export function appVersion(): string {
  if (!current) throw new Error('configureApp() must run before the app renders');
  return current.version;
}
