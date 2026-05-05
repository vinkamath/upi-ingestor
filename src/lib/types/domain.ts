export type TransactionStatus = 'pending' | 'needs_review' | 'published' | 'failed'

export type ParsedTransaction = {
  amount: number
  merchantRaw: string
  merchantNormalized: string
  occurredAt: string
  bankRefId: string
  account?: string
  currency: 'INR'
  sourceMessageId: string
  rawPayload: Record<string, unknown>
}

export type PublishResult = {
  success: boolean
  externalId?: string
  error?: string
}

export type CategorizeResult = {
  category: string | null
  source: 'rule' | 'mapping' | 'unknown'
}

export interface EmailSource {
  id: string
  fetchSince(userId: string): Promise<ParsedTransaction[]>
}

export interface Publisher {
  id: string
  publish(userId: string, tx: ParsedTransaction & { category: string }): Promise<PublishResult>
}
