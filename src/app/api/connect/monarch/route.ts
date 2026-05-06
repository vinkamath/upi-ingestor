import { getUser } from '@/lib/db/server'
import { encrypt } from '@/lib/crypto/encryption'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  credential: z.string().min(10),
  defaultAccountId: z.string().optional(),
})

function normalizeCredential(input: string) {
  const value = input.trim()
  if (value.toLowerCase().startsWith('token ')) return value.slice(6).trim()
  if (value.toLowerCase().startsWith('bearer ')) return value.slice(7).trim()
  return value
}

async function validateMonarchCredential(credential: string, defaultAccountId?: string) {
  const graphqlUrl = process.env.MONARCH_GRAPHQL_URL
  if (!graphqlUrl) {
    return { ok: false as const, error: 'MONARCH_GRAPHQL_URL not set' }
  }

  const response = await fetch(graphqlUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${credential}`,
    },
    body: JSON.stringify({
      query: `query ConnectionCheck { accounts { id displayName name } }`,
      variables: {},
    }),
  })

  const json = await response.json()
  const accounts = (json?.data?.accounts ?? []) as Array<{ id: string; displayName?: string; name?: string }>
  if (!response.ok || !Array.isArray(accounts)) {
    return { ok: false as const, error: 'Monarch credential check failed' }
  }

  if (defaultAccountId && !accounts.some((account) => account.id === defaultAccountId)) {
    return {
      ok: false as const,
      error: 'Default account id was not found in your Monarch accounts',
    }
  }

  return { ok: true as const, accountCount: accounts.length }
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = schema.safeParse(json)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const credential = normalizeCredential(parsed.data.credential)
  const defaultAccountId = parsed.data.defaultAccountId?.trim() || undefined
  const validation = await validateMonarchCredential(credential, defaultAccountId)
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const encrypted = encrypt(credential)

  const { error } = await supabase.from('monarch_connections').upsert({
    user_id: user.id,
    email: parsed.data.email.trim().toLowerCase(),
    credential_enc: encrypted,
    default_account_id: defaultAccountId ?? null,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true, accountCount: validation.accountCount })
}
