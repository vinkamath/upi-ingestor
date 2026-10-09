import { z } from 'zod'
import { getUser } from '@/lib/db/server'
import { decrypt, encrypt, type EncryptedPayload } from '@/lib/crypto/encryption'
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

/**
 * Tests an app password against Gmail IMAP without changing anything.
 * Body `{ appPassword }` tests that value; an empty body tests the saved one.
 */
export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  const json: unknown = await request.json().catch(() => ({}))

  const { data: connection, error: connectionError } = await supabase
    .from('gmail_connections')
    .select('email_address, imap_app_password_enc')
    .eq('user_id', user.id)
    .maybeSingle()
  if (connectionError) return Response.json({ error: connectionError.message }, { status: 400 })
  if (!connection) return Response.json({ error: 'Sign in with Google first' }, { status: 400 })

  let appPassword: string
  let source: 'typed' | 'saved'
  const typed = (json as { appPassword?: unknown } | null)?.appPassword
  if (typeof typed === 'string' && typed.trim()) {
    const parsed = putSchema.safeParse({ appPassword: typed })
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid app password' }, { status: 400 })
    }
    appPassword = parsed.data.appPassword
    source = 'typed'
  } else if (connection.imap_app_password_enc) {
    try {
      appPassword = decrypt(connection.imap_app_password_enc as EncryptedPayload)
    } catch {
      return Response.json(
        { error: 'The saved app password could not be decrypted (encryption key changed?). Paste it again.' },
        { status: 400 }
      )
    }
    source = 'saved'
  } else {
    return Response.json({ error: 'No app password saved. Paste one to test it.' }, { status: 400 })
  }

  try {
    await verifyGmailAppPassword(connection.email_address, appPassword)
  } catch (error) {
    if (error instanceof ImapAuthError) {
      return Response.json(
        {
          error: `Gmail rejected the ${source} app password for ${connection.email_address}${
            error.message !== 'Gmail rejected the app password' ? `: ${error.message}` : '.'
          }`,
        },
        { status: 400 }
      )
    }
    const detail = error instanceof Error ? error.message : String(error)
    return Response.json({ error: `Could not reach Gmail IMAP: ${detail}` }, { status: 502 })
  }

  return Response.json({ ok: true, source, emailAddress: connection.email_address })
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
