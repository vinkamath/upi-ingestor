import { monarchPublisher } from './monarch/publisher'
import type { ParsedTransaction } from '@/lib/types/domain'

export const publishers = {
  monarch: monarchPublisher,
}

/** The `transactions` columns needed to publish a stored row. */
export type TransactionRow = {
  amount: number | string
  merchant_raw: string
  merchant_normalized: string
  occurred_at: string
  email_received_at: string | null
  bank_ref_id: string
  source_message_id: string
  raw_payload: Record<string, unknown> | null
}

export function rowToParsed(row: TransactionRow): ParsedTransaction {
  return {
    amount: Number(row.amount),
    merchantRaw: row.merchant_raw,
    merchantNormalized: row.merchant_normalized,
    occurredAt: row.occurred_at,
    emailReceivedAt: row.email_received_at ?? row.occurred_at,
    bankRefId: row.bank_ref_id,
    sourceMessageId: row.source_message_id,
    currency: 'INR',
    rawPayload: row.raw_payload ?? {},
  }
}

/** Publishes a stored row to Monarch and returns the result plus the columns to write back. */
export async function publishTransactionRow(userId: string, row: TransactionRow, category: string) {
  const publish = await publishers.monarch.publish(userId, { ...rowToParsed(row), category })
  const update = {
    category,
    status: publish.success ? ('published' as const) : ('failed' as const),
    published_id: publish.externalId ?? null,
    raw_payload: publish.success
      ? row.raw_payload
      : { ...(row.raw_payload ?? {}), publish_error: publish.error ?? 'Unknown publish error' },
  }
  return { publish, update }
}
