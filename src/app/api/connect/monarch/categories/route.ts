import { getUser } from '@/lib/db/server'
import { decrypt } from '@/lib/crypto/encryption'

type CredentialPayload = {
  iv: string
  content: string
  authTag: string
}

function buildTokenHeader(secret: string) {
  const trimmed = secret.trim()
  if (trimmed.toLowerCase().startsWith('token ')) return trimmed
  if (trimmed.toLowerCase().startsWith('bearer ')) return `Token ${trimmed.slice(7).trim()}`
  return `Token ${trimmed}`
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

  const credential = decrypt(data.credential_enc as CredentialPayload)
  const flatResponse = await fetch(process.env.MONARCH_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: buildTokenHeader(credential),
    },
    body: JSON.stringify({
      query: `query RuleCategories { categories { id name } }`,
      variables: {},
    }),
  })
  const flatJson = await flatResponse.json()
  const categories = (flatJson?.data?.categories ?? []) as Array<{ id?: string; name?: string }>
  if (!flatResponse.ok || !Array.isArray(categories)) {
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
