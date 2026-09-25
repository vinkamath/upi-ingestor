import { getUser } from '@/lib/db/server'
import { decrypt } from '@/lib/crypto/encryption'
import type { MonarchCategoryOption } from '@/lib/monarch-categories'

type CredentialPayload = {
  iv: string
  content: string
  authTag: string
}

type CategoriesError = {
  message: string
  needsReconnect: boolean
}

function buildTokenHeader(secret: string) {
  const trimmed = secret.trim()
  if (trimmed.toLowerCase().startsWith('token ')) return trimmed
  if (trimmed.toLowerCase().startsWith('bearer ')) return `Token ${trimmed.slice(7).trim()}`
  return `Token ${trimmed}`
}

async function fetchMonarchCategories(
  credentialEnc: CredentialPayload
): Promise<{ categories: MonarchCategoryOption[] } | { error: CategoriesError }> {
  const graphqlUrl = process.env.MONARCH_GRAPHQL_URL
  if (!graphqlUrl) return { error: { message: 'MONARCH_GRAPHQL_URL not set', needsReconnect: false } }

  try {
    const credential = decrypt(credentialEnc)
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: buildTokenHeader(credential),
      },
      body: JSON.stringify({
        query: `query RuleCategories { categories { id name } }`,
        variables: {},
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (response.status === 401 || response.status === 403) {
      return {
        error: {
          message: 'Monarch session expired. Reconnect Monarch in Settings to load categories.',
          needsReconnect: true,
        },
      }
    }

    const json = await response.json().catch(() => null)
    const categories = json?.data?.categories
    if (!response.ok || !Array.isArray(categories)) {
      const detail = json?.errors?.[0]?.message ?? `HTTP ${response.status}`
      return { error: { message: `Could not load Monarch categories (${detail}).`, needsReconnect: false } }
    }

    return {
      categories: (categories as Array<{ id?: string; name?: string }>)
        .map((category, index) => ({
          id: category.id || `cat-${index}`,
          name: category.name?.trim() ?? '',
        }))
        .filter((category) => Boolean(category.name))
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    return { error: { message: `Could not load Monarch categories (${detail}).`, needsReconnect: false } }
  }
}

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('monarch_connections')
    .select('credential_enc')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  if (!data) {
    return Response.json(
      { error: 'Monarch is not connected. Connect it in Settings to load categories.', needsReconnect: true },
      { status: 400 }
    )
  }

  const result = await fetchMonarchCategories(data.credential_enc as CredentialPayload)
  if ('error' in result) {
    console.error('monarch.categories_failed', { userId: user.id, error: result.error.message })
    return Response.json(
      { error: result.error.message, needsReconnect: result.error.needsReconnect },
      { status: 502 }
    )
  }
  if (result.categories.length === 0) {
    return Response.json({ error: 'Monarch returned no categories.', needsReconnect: false }, { status: 502 })
  }

  return Response.json({ categories: result.categories })
}
