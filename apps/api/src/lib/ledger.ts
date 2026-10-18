import { sumCents } from '@zahln/shared';
import { eq, sql } from 'drizzle-orm';
import type { DbOrTx, Tx } from '../db/client';
import { accounts, ledgerTransactions, postings } from '../db/schema';

export const accountId = {
  consumer: (userId: string) => `consumer_wallet:${userId}`,
  merchant: (merchantId: string) => `merchant_wallet:${merchantId}`,
  topupSource: 'topup_source',
  settlementOutbound: 'settlement_outbound',
} as const;

export type Posting = { accountId: string; amountCents: number };
export type LedgerKind = (typeof ledgerTransactions.$inferInsert)['kind'];

export class UnbalancedTransactionError extends Error {}

/**
 * Write one balanced ledger transaction. Checked here for a clear error, and again by a
 * deferred database trigger at COMMIT, so a bug can never persist an unbalanced transaction.
 */
export async function postTransaction(
  tx: Tx,
  input: { kind: LedgerKind; reference: string; postings: Posting[] },
): Promise<string> {
  if (input.postings.length < 2)
    throw new UnbalancedTransactionError('a transaction needs at least two postings');
  const total = sumCents(input.postings.map((p) => p.amountCents));
  if (total !== 0) throw new UnbalancedTransactionError(`postings sum to ${total}, expected 0`);

  const [row] = await tx
    .insert(ledgerTransactions)
    .values({ kind: input.kind, reference: input.reference })
    .returning({ id: ledgerTransactions.id });
  if (!row) throw new Error('failed to create ledger transaction');

  await tx.insert(postings).values(input.postings.map((p) => ({ transactionId: row.id, ...p })));
  return row.id;
}

/** Balance = sum of postings. Never a stored, mutable number. */
export async function balanceOf(db: DbOrTx, account: string): Promise<number> {
  const [row] = await db
    .select({ balance: sql<string>`COALESCE(SUM(${postings.amountCents}), 0)` })
    .from(postings)
    .where(eq(postings.accountId, account));
  return Number(row?.balance ?? 0);
}

/**
 * Lock an account row for the rest of the transaction. Two payments from the same wallet
 * serialise here, so "check balance, then debit" can't race.
 */
export async function lockAccount(tx: Tx, account: string): Promise<void> {
  const rows = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.id, account))
    .for('update');
  if (rows.length === 0) throw new Error(`account ${account} does not exist`);
}
