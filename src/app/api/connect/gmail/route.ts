import { getUser } from '@/lib/db/server'
import { encrypt } from '@/lib/crypto/encryption'
import { z } from 'zod'

const schema = z.object({
  emailAddress: z.string().email(),
  refreshToken: z.string().min(20),
})

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  const parsed = schema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const encrypted = encrypt(parsed.data.refreshToken)

  const { error } = await supabase.from('gmail_connections').upsert({
    user_id: user.id,
    email_address: parsed.data.emailAddress,
    refresh_token_enc: encrypted,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
