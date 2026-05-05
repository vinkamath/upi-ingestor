import { parseHdfcUpiEmail } from './hdfc'
import type { ParsedTransaction } from '@/lib/types/domain'

export function parseUpiEmail(messageId: string, sender: string, body: string): ParsedTransaction | null {
  if (sender.toLowerCase().includes('hdfc')) {
    return parseHdfcUpiEmail(messageId, body)
  }

  return parseHdfcUpiEmail(messageId, body)
}
