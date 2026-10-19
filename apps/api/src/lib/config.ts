import {
  type AdminConfig,
  AdminConfigSchema,
  type AppName,
  INITIAL_ADMIN_CONFIG,
  PLAN_FEATURES,
  type Plan,
  type RemoteConfig,
} from '@zaster/shared';
import { and, eq, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { appConfig, merchants, staff } from '../db/schema';

export type StoredConfig = { version: number; data: AdminConfig; updatedAt: string };

/** The global config row, created with the initial values on first use. */
export async function getStoredConfig(db: DbOrTx): Promise<StoredConfig> {
  const [row] = await db.select().from(appConfig).where(eq(appConfig.id, 'global'));
  if (row)
    return {
      version: row.version,
      data: AdminConfigSchema.parse(row.data),
      updatedAt: row.updatedAt.toISOString(),
    };
  const [created] = await db
    .insert(appConfig)
    .values({ id: 'global', version: 1, data: INITIAL_ADMIN_CONFIG })
    .onConflictDoNothing()
    .returning();
  return created
    ? { version: created.version, data: INITIAL_ADMIN_CONFIG, updatedAt: created.updatedAt.toISOString() }
    : getStoredConfig(db);
}

/** Replace the config and bump its version. Returns the new version and which top-level keys changed. */
export async function saveConfig(db: DbOrTx, next: AdminConfig) {
  const before = await getStoredConfig(db);
  const [row] = await db
    .update(appConfig)
    .set({ data: next, version: sql`${appConfig.version} + 1`, updatedAt: sql`now()` })
    .where(eq(appConfig.id, 'global'))
    .returning();
  if (!row) throw new Error('config row vanished');
  const changed = diffPaths(before.data, next);
  return { version: row.version, changed };
}

function diffPaths(a: unknown, b: unknown, path = ''): string[] {
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return JSON.stringify(a) === JSON.stringify(b) ? [] : [path || '(root)'];
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].flatMap((k) =>
    diffPaths(
      (a as Record<string, unknown>)[k],
      (b as Record<string, unknown>)[k],
      path ? `${path}.${k}` : k,
    ),
  );
}

/**
 * The config one app instance should run with: the global switches, that app's release window,
 * and for a till the plan and features of the merchant it belongs to.
 */
export async function configFor(
  db: DbOrTx,
  input: { app: AppName; userId: string | null; merchantId: string | null },
): Promise<RemoteConfig> {
  const stored = await getStoredConfig(db);
  let plan: Plan | null = null;
  if (input.app === 'merchant' && input.userId) {
    const rows = await db
      .select({ merchantId: merchants.id, plan: merchants.plan })
      .from(staff)
      .innerJoin(merchants, eq(merchants.id, staff.merchantId))
      .where(
        input.merchantId
          ? and(eq(staff.userId, input.userId), eq(staff.merchantId, input.merchantId))
          : eq(staff.userId, input.userId),
      );
    plan = rows[0]?.plan ?? null;
  }
  const release = stored.data.apps[input.app];
  return {
    version: stored.version,
    app: input.app,
    minSupportedVersion: release.minSupportedVersion,
    latestVersion: release.latestVersion,
    killSwitches: stored.data.killSwitches,
    flags: stored.data.flags,
    limits: stored.data.limits,
    banner: stored.data.banner,
    plan,
    features: plan ? [...PLAN_FEATURES[plan]] : [],
    ttlSeconds: 60,
  };
}
