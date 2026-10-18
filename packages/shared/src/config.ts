import { z } from 'zod';
import { FEATURES, PLANS } from './plans';

/**
 * Server-driven config: the way to change a shipped app without a release.
 *
 * Three kinds of switch, delivered the same way but owned and defaulted differently:
 * - Kill switch (on-call engineer, incidents): `true` turns a feature OFF. Unknown → feature stays on.
 * - Feature flag (product, rollouts): `true` turns something ON. Unknown → off.
 * - Plan feature (billing): what the merchant's plan includes. Unknown → the last known plan.
 */
export const KILL_SWITCHES = ['nfc_pay', 'refunds', 'topup'] as const;
export type KillSwitch = (typeof KILL_SWITCHES)[number];

export const FLAGS = ['discreet_mode_default'] as const;
export type Flag = (typeof FLAGS)[number];

export const APPS = ['consumer', 'merchant'] as const;
export type AppName = (typeof APPS)[number];

const Semver = z.string().regex(/^\d+\.\d+\.\d+$/, 'expected x.y.z');

export const AppReleaseSchema = z.object({ minSupportedVersion: Semver, latestVersion: Semver });

export const BannerSchema = z.object({ de: z.string().max(140), en: z.string().max(140) }).nullable();

/** What ops edits in the console. */
export const AdminConfigSchema = z.object({
  killSwitches: z.object(
    Object.fromEntries(KILL_SWITCHES.map((k) => [k, z.boolean()])) as Record<KillSwitch, z.ZodBoolean>,
  ),
  flags: z.object(Object.fromEntries(FLAGS.map((f) => [f, z.boolean()])) as Record<Flag, z.ZodBoolean>),
  apps: z.object({ consumer: AppReleaseSchema, merchant: AppReleaseSchema }),
  limits: z.object({ reauthAboveCents: z.number().int().min(0), maxPaymentCents: z.number().int().min(1) }),
  banner: BannerSchema,
});
export type AdminConfig = z.infer<typeof AdminConfigSchema>;

/** What one app receives: the global config resolved for that app, plus the merchant's plan if it is a till. */
export const RemoteConfigSchema = z.object({
  version: z.number().int(),
  app: z.enum(APPS),
  minSupportedVersion: Semver,
  latestVersion: Semver,
  killSwitches: AdminConfigSchema.shape.killSwitches,
  flags: AdminConfigSchema.shape.flags,
  limits: AdminConfigSchema.shape.limits,
  banner: BannerSchema,
  plan: z.enum(PLANS).nullable(),
  features: z.array(z.enum(FEATURES)),
  ttlSeconds: z.number().int().positive(),
});
export type RemoteConfig = z.infer<typeof RemoteConfigSchema>;

export const INITIAL_ADMIN_CONFIG: AdminConfig = {
  killSwitches: { nfc_pay: false, refunds: false, topup: false },
  flags: { discreet_mode_default: false },
  apps: {
    consumer: { minSupportedVersion: '0.1.0', latestVersion: '0.1.0' },
    merchant: { minSupportedVersion: '0.1.0', latestVersion: '0.1.0' },
  },
  limits: { reauthAboveCents: 5000, maxPaymentCents: 50000 },
  banner: null,
};

/**
 * Bundled in the binary, used only when there is neither a server answer nor a cached one.
 * Conservative: no kill switch fired (features work), flags off, no plan features assumed,
 * and never a forced update (a stale default must not lock people out of their money).
 */
export function bundledDefaults(app: AppName): RemoteConfig {
  return {
    version: 0,
    app,
    minSupportedVersion: '0.0.0',
    latestVersion: '0.0.0',
    killSwitches: { ...INITIAL_ADMIN_CONFIG.killSwitches },
    flags: { ...INITIAL_ADMIN_CONFIG.flags },
    limits: { ...INITIAL_ADMIN_CONFIG.limits },
    banner: null,
    plan: null,
    features: [],
    ttlSeconds: 60,
  };
}

/** Numeric semver compare (no pre-release tags): -1, 0 or 1. "1.10.0" > "1.9.0", unlike a string compare. */
export function compareVersions(a: string, b: string): -1 | 0 | 1 {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

export function updateStatus(
  appVersion: string,
  config: Pick<RemoteConfig, 'minSupportedVersion' | 'latestVersion'>,
) {
  if (compareVersions(appVersion, config.minSupportedVersion) < 0) return 'required' as const;
  if (compareVersions(appVersion, config.latestVersion) < 0) return 'available' as const;
  return 'current' as const;
}
