import { getUser } from '@/lib/db/server'
import { decrypt } from '@/lib/crypto/encryption'
import { deserializeMonarchSession, monarchGraphqlFetch } from '@/lib/publishers/monarch/session'

type CredentialPayload = {
  iv: string
  content: string
  authTag: string
}

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('monarch_connections')
    .select('credential_enc')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  if (!data) return Response.json({ categories: [] })
  if (!process.env.MONARCH_GRAPHQL_URL) {
    return Response.json({ error: 'MONARCH_GRAPHQL_URL not set' }, { status: 500 })
  }

  let session
  try {
    session = deserializeMonarchSession(decrypt(data.credential_enc as CredentialPayload))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Monarch session'
    return Response.json({ error: message, categories: [] }, { status: 400 })
  }

  const { response, json } = await monarchGraphqlFetch<{ categories?: Array<{ id?: string; name?: string }> }>(
    session,
    `query RuleCategories { categories { id name } }`
  )

  const categories = json?.data?.categories ?? []
  if (!response.ok || !Array.isArray(categories)) {
    return Response.json(
      { error: 'Failed to fetch Monarch categories', categories: [] },
      { status: 400 }
    )
  }

  const flat = categories
    .map((category, index) => ({
      id: category.id || `cat-${index}`,
      name: category.name?.trim() ?? '',
    }))
    .filter((category) => Boolean(category.name))
    .sort((a, b) => a.name.localeCompare(b.name))

  return Response.json({ categories: flat })
}
