import { getUser } from '@/lib/db/server'
import { encrypt } from '@/lib/crypto/encryption'
import { z } from 'zod'

const schema = z.object({
  emailAddress: z.string().email(),
  refreshToken: z.string().min(20),
})

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

  const encrypted = encrypt(parsed.data.refreshToken.trim())

  const { error } = await supabase.from('gmail_connections').upsert({
    user_id: user.id,
    email_address: parsed.data.emailAddress.trim().toLowerCase(),
    refresh_token_enc: encrypted,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
