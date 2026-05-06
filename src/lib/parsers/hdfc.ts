import type { ParsedTransaction } from '@/lib/types/domain'
import { normalizeMerchant } from '@/lib/categorizer/normalize'

function extractMerchant(body: string) {
  // Handles: "to VPA <vpa> <merchant> on <date>"
  const vpaStyleMatch = body.match(/to\s+VPA\s+[^\s]+\s+(.+?)\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i)
  if (vpaStyleMatch?.[1]) return vpaStyleMatch[1].trim()

  // Handles generic: "to <merchant> on <date>"
  const genericMatch = body.match(/to\s+(.+?)\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i)
  if (genericMatch?.[1]) return genericMatch[1].trim()

  return null
}

export function parseHdfcUpiEmail(messageId: string, body: string): ParsedTransaction | null {
  const amountMatch = body.match(/INR\s?([\d,]+\.\d{1,2})/i) ?? body.match(/Rs\.?\s?([\d,]+\.\d{1,2})/i)
  const merchantRaw = extractMerchant(body)
  const refMatch =
    body.match(/(?:UTR|Ref(?:erence)?\s?No)\s*[:#-]?\s*([A-Za-z0-9-]+)/i) ??
    body.match(/reference\s+number\s+is\s+([A-Za-z0-9-]+)/i) ??
    body.match(/transaction\s+reference\s+number\s+is\s+([A-Za-z0-9-]+)/i)
  const tsMatch = body.match(/on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)

  if (!amountMatch || !merchantRaw || !refMatch) return null

  const amount = Number(amountMatch[1].replace(/,/g, ''))
  const bankRefId = refMatch[1].trim()
  const occurredAt = tsMatch ? new Date(tsMatch[1]).toISOString() : new Date().toISOString()

  if (Number.isNaN(amount)) return null

  return {
    amount,
    merchantRaw,
    merchantNormalized: normalizeMerchant(merchantRaw),
    occurredAt,
    emailReceivedAt: new Date().toISOString(),
    bankRefId,
    currency: 'INR',
    sourceMessageId: messageId,
    rawPayload: { body, sender: 'hdfcbank' },
  }
}
