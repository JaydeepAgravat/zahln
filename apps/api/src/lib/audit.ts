import type { DbOrTx } from '../db/client';
import { auditLog } from '../db/schema';

/** One line of evidence per console write: who, what, on which target, and why. */
export async function audit(
  db: DbOrTx,
  entry: { actor: string; action: string; target: string; reason: string; data?: Record<string, unknown> },
) {
  await db.insert(auditLog).values({ ...entry, data: entry.data ?? {} });
}
