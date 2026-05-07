import type { Publisher } from '@/lib/types/domain'
import { createMonarchTransaction } from './client'

export const monarchPublisher: Publisher = {
  id: 'monarch',
  async publish(userId, tx) {
    try {
      const id = await createMonarchTransaction(userId, {
        amount: tx.amount,
        merchantName: tx.merchantRaw,
        category: tx.category,
        date: tx.emailReceivedAt,
        notes: `Ref: ${tx.bankRefId} | INR: ${tx.amount.toFixed(2)}`,
      })
      return { success: true, externalId: id }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown publish error' }
    }
  },
}
