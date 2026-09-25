import { z } from 'zod'
import { getUser } from '@/lib/db/server'
import { encrypt } from '@/lib/crypto/encryption'
import { ImapAuthError, verifyGmailAppPassword } from '@/lib/email-sources/gmail-imap'

const putSchema = z.object({
  appPassword: z
    .string()
    .transform((value) => value.replace(/\s+/g, ''))
    .pipe(z.string().regex(/^[a-zA-Z]{16}$/, 'App passwords are 16 letters')),
})

async function getConnection(supabase: Awaited<ReturnType<typeof getUser>>['supabase'], userId: string) {
  return supabase.from('gmail_connections').select('email_address').eq('user_id', userId).maybeSingle()
}

export async function PUT(request: Request) {
  const { supabase, user } = await getUser()
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = putSchema.safeParse(json)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid app password' }, { status: 400 })
  }

  const { data: connection, error: connectionError } = await getConnection(supabase, user.id)
  if (connectionError) return Response.json({ error: connectionError.message }, { status: 400 })
  if (!connection) return Response.json({ error: 'Sign in with Google before adding an app password' }, { status: 400 })

  try {
    await verifyGmailAppPassword(connection.email_address, parsed.data.appPassword)
  } catch (error) {
    if (error instanceof ImapAuthError) {
      return Response.json(
        { error: `Gmail rejected this app password for ${connection.email_address}.` },
        { status: 400 }
      )
    }
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Could not reach Gmail IMAP: ${detail}` }, { status: 502 })
  }

  const { error } = await supabase
    .from('gmail_connections')
    .update({
      imap_app_password_enc: encrypt(parsed.data.appPassword),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true })
}

export async function DELETE() {
  const { supabase, user } = await getUser()
  const { error } = await supabase
    .from('gmail_connections')
    .update({ imap_app_password_enc: null, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
