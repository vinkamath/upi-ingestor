import { google, gmail_v1 } from 'googleapis'
import type { ParsedTransaction } from '@/lib/types/domain'
import { parseUpiEmail } from '@/lib/parsers'
import { createAdminClient } from '@/lib/supabase/admin'
import { decrypt } from '@/lib/crypto/encryption'
import { fetchGmailMessagesViaImap } from '@/lib/email-sources/gmail-imap'
import {
  getDefaultFetchDaysBack,
  getDefaultFetchMaxResults,
  getIstMidnightCutoffEpochSeconds,
  getIstMidnightEpochSecondsForYmd,
} from '@/lib/email-sources/gmail-cutoff'

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

function decodeGmailBase64(input: string) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

function extractTextPlainBody(part?: gmail_v1.Schema$MessagePart): string | null {
  if (!part) return null
  if (part.mimeType === 'text/plain' && part.body?.data) {
    return decodeGmailBase64(part.body.data)
  }

  for (const child of part.parts ?? []) {
    const nested = extractTextPlainBody(child)
    if (nested) return nested
  }

  if (part.body?.data) {
    return decodeGmailBase64(part.body.data)
  }

  return null
}

export type GmailFetchError = {
  code: 'not_connected' | 'auth_failed' | 'invalid_grant' | 'fetch_failed'
  message: string
  needsReconnect: boolean
}

export type GmailFetchResult = {
  transactions: ParsedTransaction[]
  error?: GmailFetchError
  debug: {
    query: string
    matchedMessages: number
    parsedTransactions: number
    skippedNoBody: number
    skippedParseFailure: number
    sampleSubjects: string[]
    parseErrors: Array<{
      messageId: string
      subject: string
      from: string
      reason: 'missing_or_invalid_required_fields'
    }>
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: { message?: string } }).cause
    if (cause?.message) return cause.message
    return error.message
  }
  return String(error)
}

function toGmailFetchError(error: unknown): GmailFetchError {
  const raw = getErrorMessage(error)
  const authFailed =
    raw.includes('AUTHENTICATIONFAILED') ||
    raw.includes('Invalid credentials') ||
    raw.includes('Application-specific password required')
  const needsReconnect = raw.includes('invalid_grant')
  if (authFailed) {
    return {
      code: 'auth_failed',
      message: 'Gmail app password was rejected. Update it in Settings → Gmail.',
      needsReconnect: true,
    }
  }
  if (needsReconnect) {
    return {
      code: 'invalid_grant',
      message: 'Gmail access expired or was revoked. Reconnect in Settings → Gmail.',
      needsReconnect: true,
    }
  }
  return {
    code: 'fetch_failed',
    message: `Gmail fetch failed: ${raw}`,
    needsReconnect: false,
  }
}

export async function fetchGmailTransactions(userId: string): Promise<GmailFetchResult> {
  const supabase = createAdminClient()
  const { data: connection, error } = await supabase
    .from('gmail_connections')
    .select('auth_type,app_password_enc,refresh_token_enc,last_history_id,email_address,fetch_since_date')
    .eq('user_id', userId)
    .maybeSingle()

  const appPasswordPayload = connection?.app_password_enc as { iv: string; content: string; authTag: string } | null
  const refreshTokenPayload = connection?.refresh_token_enc as { iv: string; content: string; authTag: string } | null

  if (error || !connection || (!appPasswordPayload && !refreshTokenPayload)) {
    return {
      transactions: [],
      error: {
        code: 'not_connected',
        message: 'Gmail is not connected. Connect in Settings → Gmail.',
        needsReconnect: false,
      },
      debug: {
        query: '',
        matchedMessages: 0,
        parsedTransactions: 0,
        skippedNoBody: 0,
        skippedParseFailure: 0,
        sampleSubjects: [],
        parseErrors: [],
      },
    }
  }

  try {
    const maxResults = getDefaultFetchMaxResults()
    const labelName = process.env.GMAIL_FETCH_LABEL?.trim() || 'UPI'
    const fetchSinceDate = connection.fetch_since_date as string | null
    const afterEpoch = fetchSinceDate
      ? getIstMidnightEpochSecondsForYmd(fetchSinceDate)
      : getIstMidnightCutoffEpochSeconds(getDefaultFetchDaysBack())
    const parsed: ParsedTransaction[] = []
    const sampleSubjects: string[] = []
    let skippedNoBody = 0
    let skippedParseFailure = 0
    const parseErrors: GmailFetchResult['debug']['parseErrors'] = []

    if (appPasswordPayload) {
      const appPassword = decrypt(appPasswordPayload)
      const messages = await fetchGmailMessagesViaImap({
        emailAddress: connection.email_address as string,
        appPassword,
        labelName,
        afterEpochSeconds: afterEpoch,
        maxResults,
      })

      for (const message of messages) {
        if (sampleSubjects.length < 5) sampleSubjects.push(message.subject)

        if (!message.body) {
          skippedNoBody += 1
          continue
        }

        const tx = parseUpiEmail(message.id, message.from, message.body)
        if (tx) {
          parsed.push({
            ...tx,
            occurredAt: message.receivedAt,
            emailReceivedAt: message.receivedAt,
          })
        } else {
          skippedParseFailure += 1
          parseErrors.push({
            messageId: message.id,
            subject: message.subject,
            from: message.from,
            reason: 'missing_or_invalid_required_fields',
          })
        }
      }

      return {
        transactions: parsed,
        debug: {
          query: `imap mailbox:${process.env.GMAIL_IMAP_MAILBOX?.trim() || labelName} since:${afterEpoch}`,
          matchedMessages: messages.length,
          parsedTransactions: parsed.length,
          skippedNoBody,
          skippedParseFailure,
          sampleSubjects,
          parseErrors,
        },
      }
    }

    const refreshToken = decrypt(refreshTokenPayload!)
    const auth = getOauthClient(refreshToken)
    const gmail = google.gmail({ version: 'v1', auth })
    const query = `label:${labelName} after:${afterEpoch}`

    const list = await gmail.users.messages.list({
      userId: 'me',
      maxResults,
      q: query,
    })

    const messages = list.data.messages ?? []

    for (const message of messages) {
      if (!message.id) continue
      const full = await gmail.users.messages.get({ userId: 'me', id: message.id, format: 'full' })
      const payload = full.data.payload
      const headers = payload?.headers ?? []
      const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value ?? ''
      const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value ?? '(no-subject)'
      if (sampleSubjects.length < 5) sampleSubjects.push(subject)

      const body = extractTextPlainBody(payload ?? undefined)
      if (!body) {
        skippedNoBody += 1
        continue
      }
      const tx = parseUpiEmail(message.id, from, body)
      if (tx) {
        const internalDateMs = Number(full.data.internalDate)
        const emailReceivedAt = Number.isFinite(internalDateMs) && internalDateMs > 0
          ? new Date(internalDateMs).toISOString()
          : new Date().toISOString()
        parsed.push({
          ...tx,
          occurredAt: emailReceivedAt,
          emailReceivedAt,
        })
      } else {
        skippedParseFailure += 1
        parseErrors.push({
          messageId: message.id,
          subject,
          from,
          reason: 'missing_or_invalid_required_fields',
        })
      }
    }

    return {
      transactions: parsed,
      debug: {
        query,
        matchedMessages: messages.length,
        parsedTransactions: parsed.length,
        skippedNoBody,
        skippedParseFailure,
        sampleSubjects,
        parseErrors,
      },
    }
  } catch (error) {
    const fetchError = toGmailFetchError(error)
    console.error('gmail.fetch_failed', { userId, code: fetchError.code, error })
    return {
      transactions: [],
      error: fetchError,
      debug: {
        query: 'error',
        matchedMessages: 0,
        parsedTransactions: 0,
        skippedNoBody: 0,
        skippedParseFailure: 0,
        sampleSubjects: [],
        parseErrors: [],
      },
    }
  }
}
