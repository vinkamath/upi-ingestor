import type { ParsedTransaction } from '@/lib/types/domain'
import { normalizeMerchant } from '@/lib/categorizer/normalize'

export function parseHdfcUpiEmail(messageId: string, body: string): ParsedTransaction | null {
  const amountMatch = body.match(/INR\s?([\d,]+\.\d{1,2})/i) ?? body.match(/Rs\.?\s?([\d,]+\.\d{1,2})/i)
  const merchantMatch = body.match(/to\s+([A-Za-z0-9@._ -]+)/i)
  const refMatch = body.match(/(?:UTR|Ref(?:erence)?\s?No)\s*[:#-]?\s*([A-Za-z0-9-]+)/i)
  const tsMatch = body.match(/on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)

  if (!amountMatch || !merchantMatch || !refMatch) return null

  const amount = Number(amountMatch[1].replace(/,/g, ''))
  const merchantRaw = merchantMatch[1].trim()
  const bankRefId = refMatch[1].trim()
  const occurredAt = tsMatch ? new Date(tsMatch[1]).toISOString() : new Date().toISOString()

  if (Number.isNaN(amount)) return null

  return {
    amount,
    merchantRaw,
    merchantNormalized: normalizeMerchant(merchantRaw),
    occurredAt,
    bankRefId,
    currency: 'INR',
    sourceMessageId: messageId,
    rawPayload: { body, sender: 'hdfcbank' },
  }
}
