import { decrypt } from '@/lib/crypto/encryption'
import { createClient } from '@/lib/supabase/server'

type MonarchAuth = {
  token?: string
  password?: string
  authTag: string
  iv: string
  content: string
}

function buildTokenHeader(secret: string) {
  const trimmed = secret.trim()
  if (trimmed.toLowerCase().startsWith('token ')) return trimmed
  if (trimmed.toLowerCase().startsWith('bearer ')) return `Token ${trimmed.slice(7).trim()}`
  return `Token ${trimmed}`
}

export async function getMonarchAuth(userId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monarch_connections')
    .select('email, credential_enc, default_account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) throw new Error('Monarch connection missing')

  const credential = data.credential_enc as MonarchAuth
  const secret = decrypt(credential)
  return {
    email: data.email as string,
    secret,
    defaultAccountId: data.default_account_id as string | null,
  }
}

export async function createMonarchTransaction(userId: string, payload: {
  amount: number
  merchantName: string
  category: string
  date: string
  notes?: string
}) {
  const auth = await getMonarchAuth(userId)

  if (!process.env.MONARCH_GRAPHQL_URL) {
    throw new Error('MONARCH_GRAPHQL_URL not set')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    // Minimal GraphQL call surface; compatible with community API approach.
    const response = await fetch(process.env.MONARCH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildTokenHeader(auth.secret),
      },
      body: JSON.stringify({
        query: `mutation CreateTransaction($input: CreateTransactionInput!) {\n  createTransaction(input: $input) { id }\n}`,
        variables: {
          input: {
            accountId: auth.defaultAccountId,
            amount: payload.amount,
            merchantName: payload.merchantName,
            categoryName: payload.category,
            date: payload.date,
            notes: payload.notes,
          },
        },
      }),
      signal: controller.signal,
    })

    const json = await response.json()
    const id = json?.data?.createTransaction?.id as string | undefined
    if (!response.ok || !id) {
      throw new Error(`Monarch publish failed: ${JSON.stringify(json)}`)
    }

    return id
  } finally {
    clearTimeout(timeout)
  }
}
