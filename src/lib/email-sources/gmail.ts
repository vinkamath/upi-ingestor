import { google } from 'googleapis'
import type { ParsedTransaction } from '@/lib/types/domain'
import { parseUpiEmail } from '@/lib/parsers'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto/encryption'

function getIstMidnightCutoffEpochSeconds(daysBack: number) {
  const now = new Date()
  const istOffsetMinutes = 330
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000
  const istNow = new Date(utcMillis + istOffsetMinutes * 60_000)

  const istMidnightMillis = Date.UTC(
    istNow.getUTCFullYear(),
    istNow.getUTCMonth(),
    istNow.getUTCDate(),
    0,
    0,
    0,
    0
  )

  const cutoffIstMillis = istMidnightMillis - daysBack * 24 * 60 * 60 * 1000
  const cutoffUtcMillis = cutoffIstMillis - istOffsetMinutes * 60_000
  return Math.floor(cutoffUtcMillis / 1000)
}

function getOauthClient(refreshToken: string) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_REDIRECT_URI) {
    throw new Error('Google OAuth env vars are not configured')
  }

  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

function getPositiveIntEnv(name: string, fallback: number) {
  const value = process.env[name]
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

export async function fetchGmailTransactions(userId: string): Promise<ParsedTransaction[]> {
  const supabase = await createClient()
  const { data: connection, error } = await supabase
    .from('gmail_connections')
    .select('refresh_token_enc,last_history_id,email_address')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !connection) return []

  try {
    const refreshToken = decrypt(connection.refresh_token_enc as { iv: string; content: string; authTag: string })
    const auth = getOauthClient(refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })
    const daysBack = getPositiveIntEnv('GMAIL_FETCH_DAYS_BACK', 3)
    const maxResults = getPositiveIntEnv('GMAIL_FETCH_MAX_RESULTS', 25)

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: `label:upi after:${getIstMidnightCutoffEpochSeconds(daysBack)}`,
    })

    const messages = list.data.messages ?? []
    const parsed: ParsedTransaction[] = []

    for (const message of messages) {
      if (!message.id) continue
      const full = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' })
      const payload = full.data.payload
      const headers = payload?.headers ?? []
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? ''
      const plainPart = payload?.parts?.find((p) => p.mimeType === 'text/plain')?.body?.data
      const topBody = payload?.body?.data
      const bodyData = plainPart ?? topBody
      if (!bodyData) continue

      // Gmail may return base64url content in body.data.
      const body = Buffer.from(bodyData.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
      const tx = parseUpiEmail(message.id, from, body)
      if (tx) parsed.push(tx)
    }

    return parsed
  } catch (error) {
    console.error('gmail.fetch_failed', { userId, error })
    return []
  }
}
