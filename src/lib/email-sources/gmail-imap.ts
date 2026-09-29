import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'

export type RawEmail = {
  /** Gmail message id (hex X-GM-MSGID, same id the Gmail API uses). */
  id: string
  from: string
  subject: string
  body: string | null
  receivedAt: Date | null
}

export class ImapAuthError extends Error {}

/** Parses a raw RFC 822 message into the fields the UPI parsers need. */
export async function toRawEmail(
  source: Buffer | string,
  meta: { id: string; internalDate?: Date | string | null }
): Promise<RawEmail> {
  const parsed = await simpleParser(source)
  const receivedAt = meta.internalDate ? new Date(meta.internalDate) : null
  return {
    id: meta.id,
    from: parsed.from?.text ?? '',
    subject: parsed.subject ?? '(no-subject)',
    body: parsed.text?.trim() ? parsed.text : null,
    receivedAt: receivedAt && !Number.isNaN(receivedAt.getTime()) ? receivedAt : null,
  }
}

function createClient(email: string, appPassword: string) {
  return new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user: email, pass: appPassword.replace(/\s+/g, '') },
    logger: false,
  })
}

async function connect(client: ImapFlow) {
  try {
    await client.connect()
  } catch (error) {
    if ((error as { authenticationFailed?: boolean }).authenticationFailed) {
      throw new ImapAuthError('Gmail rejected the app password')
    }
    throw error
  }
}

/** Checks that Gmail accepts the app password. Throws ImapAuthError if it doesn't. */
export async function verifyGmailAppPassword(email: string, appPassword: string) {
  const client = createClient(email, appPassword)
  await connect(client)
  await client.logout().catch(() => client.close())
}

/**
 * Reads messages matching a Gmail search query over IMAP, authenticated with a Gmail App Password.
 * Unlike OAuth refresh tokens from an unpublished Google app, app passwords don't expire weekly.
 * Returns the newest `maxResults` matches, newest first (same order as the Gmail API).
 */
export async function fetchGmailViaImap(args: {
  email: string
  appPassword: string
  query: string
  maxResults: number
}): Promise<RawEmail[]> {
  const client = createClient(args.email, args.appPassword)
  await connect(client)

  try {
    // Search "All Mail" so labelled emails are found even when a filter archives them.
    const mailboxes = await client.list()
    const allMail = mailboxes.find((box) => box.specialUse === '\\All')?.path ?? '[Gmail]/All Mail'

    const lock = await client.getMailboxLock(allMail, { readOnly: true })
    try {
      const uids = (await client.search({ gmraw: args.query }, { uid: true })) || []
      const newest = uids.sort((a, b) => a - b).slice(-args.maxResults)
      if (newest.length === 0) return []

      const messages = await client.fetchAll(
        newest,
        { uid: true, internalDate: true, source: true },
        { uid: true }
      )

      const emails: RawEmail[] = []
      for (const message of messages) {
        if (!message.source) continue
        emails.push(
          await toRawEmail(message.source, {
            id: message.emailId ? BigInt(message.emailId).toString(16) : `uid-${message.uid}`,
            internalDate: message.internalDate,
          })
        )
      }
      return emails.sort((a, b) => (b.receivedAt?.getTime() ?? 0) - (a.receivedAt?.getTime() ?? 0))
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => client.close())
  }
}
