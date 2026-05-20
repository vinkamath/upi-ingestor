import { getUser } from '@/lib/db/server'
import { decrypt, encrypt } from '@/lib/crypto/encryption'
import {
  deserializeMonarchSession,
  fetchMonarchAccounts,
  parseMonarchSessionInput,
  serializeMonarchSession,
} from '@/lib/publishers/monarch/session'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  credential: z.string().min(10),
  defaultAccountId: z.string().optional(),
})

async function validateMonarchSession(sessionInput: string, defaultAccountId?: string) {
  if (!process.env.MONARCH_GRAPHQL_URL) {
    return { ok: false as const, error: 'MONARCH_GRAPHQL_URL not set' }
  }

  let session
  try {
    session = parseMonarchSessionInput(sessionInput)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid Monarch session cookies'
    return { ok: false as const, error: message }
  }

  const accountOptions = await fetchMonarchAccounts(session)
  if (!accountOptions) {
    return { ok: false as const, error: 'Monarch session check failed' }
  }

  if (defaultAccountId && !accountOptions.some((account) => account.id === defaultAccountId)) {
    return {
      ok: false as const,
      error: 'Default account id was not found in your Monarch accounts',
    }
  }

  return { ok: true as const, session, accountCount: accountOptions.length, accounts: accountOptions }
}

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('monarch_connections')
    .select('email, default_account_id, credential_enc, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  if (!data) {
    return Response.json({
      connected: false,
      email: null,
      defaultAccountId: null,
      accounts: [],
      lastUpdatedAt: null,
    })
  }

  let accounts: Array<{ id: string; name: string }> = []
  try {
    const session = deserializeMonarchSession(
      decrypt(data.credential_enc as { iv: string; content: string; authTag: string })
    )
    accounts = (await fetchMonarchAccounts(session)) ?? []
  } catch {
    accounts = []
  }

  return Response.json({
    connected: true,
    email: data.email,
    defaultAccountId: data.default_account_id,
    accounts,
    lastUpdatedAt: data.updated_at,
  })
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

  const defaultAccountId = parsed.data.defaultAccountId?.trim() || undefined
  const validation = await validateMonarchSession(parsed.data.credential, defaultAccountId)
  if (!validation.ok) {
    return Response.json({ error: validation.error }, { status: 400 })
  }

  const encrypted = encrypt(serializeMonarchSession(validation.session))

  const { error } = await supabase.from('monarch_connections').upsert({
    user_id: user.id,
    email: parsed.data.email.trim().toLowerCase(),
    credential_enc: encrypted,
    default_account_id: defaultAccountId ?? null,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({
    ok: true,
    accountCount: validation.accountCount,
    accounts: validation.accounts,
    selectedDefaultAccountId: defaultAccountId ?? null,
  })
}
