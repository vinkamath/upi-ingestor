import { getUser } from '@/lib/db/server'
import { encrypt } from '@/lib/crypto/encryption'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  credential: z.string().min(10),
  defaultAccountId: z.string().optional(),
})

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const encrypted = encrypt(parsed.data.credential)

  const { error } = await supabase.from('monarch_connections').upsert({
    user_id: user.id,
    email: parsed.data.email,
    credential_enc: encrypted,
    default_account_id: parsed.data.defaultAccountId ?? null,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
