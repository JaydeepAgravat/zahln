import { includedVat, type VatRate } from '@zahln/shared';
import { and, eq, gte, lt, sql } from 'drizzle-orm';
import type { DbOrTx } from '../db/client';
import { paymentIntents } from '../db/schema';

export const CSV_HEADER = 'Datum;Beleg-Nr.;Betrag;MwSt.-Satz;MwSt.;Zahlungs-ID;Status';

/**
 * DATEV-style CSV of a merchant's paid payments: `;` separated, decimal comma, one row per VAT rate,
 * UTF-8 with a BOM and CRLF (what German Excel expects). Dates are calendar days in Berlin.
 */
export async function merchantCsv(
  db: DbOrTx,
  merchantId: string,
  range: { from?: string | undefined; to?: string | undefined } = {},
): Promise<{ csv: string; rows: number }> {
  const conds = [eq(paymentIntents.merchantId, merchantId), sql`${paymentIntents.paidAt} IS NOT NULL`];
  if (range.from)
    conds.push(
      gte(paymentIntents.paidAt, sql`(${range.from}::date)::timestamp AT TIME ZONE 'Europe/Berlin'`),
    );
  if (range.to)
    conds.push(
      lt(paymentIntents.paidAt, sql`((${range.to}::date + 1)::timestamp) AT TIME ZONE 'Europe/Berlin'`),
    );
  const rows = await db
    .select({
      intent: paymentIntents,
      day: sql<string>`to_char(${paymentIntents.paidAt} AT TIME ZONE 'Europe/Berlin', 'YYYY-MM-DD')`,
    })
    .from(paymentIntents)
    .where(and(...conds))
    .orderBy(paymentIntents.paidAt);

  const euro = (c: number) => (c / 100).toFixed(2).replace('.', ',');
  const lines = [CSV_HEADER];
  for (const { intent: r, day } of rows) {
    const byRate = new Map<number, number>();
    for (const item of r.items)
      byRate.set(item.vatRate, (byRate.get(item.vatRate) ?? 0) + item.unitPriceCents * item.qty);
    if (byRate.size === 0) byRate.set(0, r.amountCents);
    for (const [rate, gross] of byRate) {
      lines.push(
        [
          day,
          r.receiptNumber ?? '',
          euro(gross),
          `${rate} %`,
          euro(includedVat(gross, rate as VatRate)),
          r.id,
          r.status,
        ].join(';'),
      );
    }
  }
  return { csv: `﻿${lines.join('\r\n')}\r\n`, rows: rows.length };
}
