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

function toMonarchDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid transaction date "${value}"`)
  }
  return parsed.toISOString().slice(0, 10)
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
    const executeGraphql = async (query: string, variables: Record<string, unknown>) => {
      const response = await fetch(process.env.MONARCH_GRAPHQL_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildTokenHeader(auth.secret),
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })
      const json = await response.json()
      return { response, json }
    }

    const { response: categoriesResponse, json: categoriesJson } = await executeGraphql(
      `query RuleCategories { categories { id name } }`,
      {}
    )
    const categories = (categoriesJson?.data?.categories ?? []) as Array<{ id?: string; name?: string }>
    if (!categoriesResponse.ok || !Array.isArray(categories)) {
      throw new Error(`Monarch category lookup failed: ${JSON.stringify(categoriesJson)}`)
    }

    const requestedCategory = payload.category.trim().toLowerCase()
    const matchedCategory = categories.find(
      (category) =>
        (category.id && category.id.trim().toLowerCase() === requestedCategory) ||
        (category.name && category.name.trim().toLowerCase() === requestedCategory)
    )

    if (!matchedCategory?.id) {
      throw new Error(`Monarch category not found for "${payload.category}"`)
    }

    const normalizedDate = toMonarchDate(payload.date)
    const signedAmount = payload.amount > 0 ? -payload.amount : payload.amount
    const { response, json } = await executeGraphql(
      `mutation Common_CreateTransactionMutation($input: CreateTransactionMutationInput!) {
        createTransaction(input: $input) {
          transaction { id }
          errors { message code }
        }
      }`,
      {
        input: {
          accountId: auth.defaultAccountId,
          amount: signedAmount,
          merchantName: payload.merchantName.trim(),
          categoryId: matchedCategory.id,
          date: normalizedDate,
          notes: payload.notes?.trim() || undefined,
        },
      }
    )

    const topLevelErrors = (json?.errors ?? []) as Array<{ message?: string }>
    const createErrors = (json?.data?.createTransaction?.errors ?? []) as Array<{ message?: string }>
    const id = json?.data?.createTransaction?.transaction?.id as string | undefined
    if (response.ok && topLevelErrors.length === 0 && createErrors.length === 0 && id) {
      return id
    }

    const topLevelMessage = topLevelErrors.map((error) => error.message?.trim() || 'Unknown error').join('; ')
    const mutationMessage = createErrors.map((error) => error.message?.trim() || 'Unknown error').join('; ')
    throw new Error(topLevelMessage || mutationMessage || `Monarch publish failed: ${JSON.stringify(json)}`)
  } finally {
    clearTimeout(timeout)
  }
}
