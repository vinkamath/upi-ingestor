import { google } from 'googleapis'
import type { ParsedTransaction } from '@/lib/types/domain'
import { parseUpiEmail } from '@/lib/parsers'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto/encryption'

function getOauthClient(refreshToken: string) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

export async function fetchGmailTransactions(userId: string): Promise<ParsedTransaction[]> {
  const supabase = await createClient()
  const { data: connection, error } = await supabase
    .from('gmail_connections')
    .select('refresh_token_enc,last_history_id,email_address')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !connection) return []

  const refreshToken = decrypt(connection.refresh_token_enc as { iv: string; content: string; authTag: string })
  const auth = getOauthClient(refreshToken)
  const gmail = google.gmail({ version: 'v1', auth })

  const list = await gmail.users.messages.list({
    userId: 'me',
    maxResults: 25,
    q: 'subject:(UPI OR debited OR transaction) newer_than:7d',
  })

  const messages = list.data.messages ?? []
  const parsed: ParsedTransaction[] = []

  for (const message of messages) {
    const full = await gmail.users.messages.get({ userId: 'me', id: message.id!, format: 'full' })
    const payload = full.data.payload
    const headers = payload?.headers ?? []
    const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? ''
    const plainPart = payload?.parts?.find((p) => p.mimeType === 'text/plain')?.body?.data
    const topBody = payload?.body?.data
    const bodyData = plainPart ?? topBody
    if (!bodyData) continue

    const body = Buffer.from(bodyData, 'base64').toString('utf8')
    const tx = parseUpiEmail(message.id!, from, body)
    if (tx) parsed.push(tx)
  }

  return parsed
}
