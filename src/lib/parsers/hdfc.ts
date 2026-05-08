import type { ParsedTransaction } from '@/lib/types/domain'
import { normalizeMerchant } from '@/lib/categorizer/normalize'

function toIsoDateAtMidnight(rawDate: string): string | null {
  const parts = rawDate.split(/[/-]/).map((part) => Number(part))
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null

  const [day, month, yearPart] = parts
  const year = yearPart < 100 ? 2000 + yearPart : yearPart
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date.toISOString()
}

function buildParsedTransaction(
  messageId: string,
  body: string,
  amountRaw: string,
  merchantRaw: string,
  bankRefId: string,
  occurredAt: string
): ParsedTransaction | null {
  const amount = Number(amountRaw.replace(/,/g, ''))
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

export function parseHdfcUpiEmailNewFormat(messageId: string, body: string): ParsedTransaction | null {
  const amountMatch = body.match(/Rs\.?\s?([\d,]+\.\d{1,2})\s+is\s+debited/i)
  const merchantMatch = body.match(
    /towards\s+VPA\s+[^\s]+\s+\((.+?)\)\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i
  )
  const refMatch = body.match(/UPI\s+transaction\s+reference\s*no\.?\s*[:#-]?\s*([A-Za-z0-9-]+)/i)
  const tsDateOnlyMatch = body.match(/on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)

  if (!amountMatch?.[1] || !merchantMatch?.[1] || !refMatch?.[1] || !tsDateOnlyMatch?.[1]) return null
  const occurredAt = toIsoDateAtMidnight(tsDateOnlyMatch[1])
  if (!occurredAt) return null

  return buildParsedTransaction(
    messageId,
    body,
    amountMatch[1].trim(),
    merchantMatch[1].trim(),
    refMatch[1].trim(),
    occurredAt
  )
}

export function parseHdfcUpiEmailLegacyFormat(messageId: string, body: string): ParsedTransaction | null {
  const amountMatch = body.match(/INR\s?([\d,]+\.\d{1,2})/i) ?? body.match(/Rs\.?\s?([\d,]+\.\d{1,2})/i)
  const vpaStyleMatch = body.match(/to\s+VPA\s+[^\s]+\s+(.+?)\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i)
  const genericMatch = body.match(/to\s+(.+?)\s+on\s+\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/i)
  const merchantRaw = vpaStyleMatch?.[1]?.trim() ?? genericMatch?.[1]?.trim() ?? null
  const refMatch =
    body.match(/(?:UTR|Ref(?:erence)?\s*No\.?)\s*[:#-]?\s*([A-Za-z0-9-]+)/i) ??
    body.match(/reference\s+number\s+is\s+([A-Za-z0-9-]+)/i) ??
    body.match(/transaction\s+reference\s+number\s+is\s+([A-Za-z0-9-]+)/i)
  const tsWithTimeMatch = body.match(/on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\s+\d{1,2}:\d{2}(?::\d{2})?)/i)
  const tsDateOnlyMatch = body.match(/on\s+(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i)

  if (!amountMatch?.[1] || !merchantRaw || !refMatch?.[1]) return null
  const occurredAt =
    (tsWithTimeMatch?.[1] ? new Date(tsWithTimeMatch[1]).toISOString() : null) ??
    (tsDateOnlyMatch?.[1] ? toIsoDateAtMidnight(tsDateOnlyMatch[1]) : null) ??
    null
  if (!occurredAt) return null

  return buildParsedTransaction(messageId, body, amountMatch[1].trim(), merchantRaw, refMatch[1].trim(), occurredAt)
}

export function parseHdfcUpiEmail(messageId: string, body: string): ParsedTransaction | null {
  return parseHdfcUpiEmailNewFormat(messageId, body) ?? parseHdfcUpiEmailLegacyFormat(messageId, body)
}
