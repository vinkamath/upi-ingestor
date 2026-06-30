import tls from 'tls'

export type ImapGmailMessage = {
  id: string
  from: string
  subject: string
  body: string | null
  receivedAt: string
}

type ImapFetchOptions = {
  emailAddress: string
  appPassword: string
  labelName: string
  afterEpochSeconds: number
  maxResults: number
}

const IMAP_HOST = 'imap.gmail.com'
const IMAP_PORT = 993
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

class ImapClient {
  private socket: tls.TLSSocket | null = null
  private nextTag = 1

  async connect() {
    this.socket = tls.connect({
      host: IMAP_HOST,
      port: IMAP_PORT,
      servername: IMAP_HOST,
    })
    this.socket.setEncoding('utf8')
    await this.waitForGreeting()
  }

  async login(emailAddress: string, appPassword: string) {
    await this.command(`LOGIN ${quoteImapString(emailAddress)} ${quoteImapString(appPassword)}`)
  }

  async select(mailbox: string) {
    await this.command(`SELECT ${quoteImapString(mailbox)}`)
  }

  async searchSince(afterEpochSeconds: number) {
    const response = await this.command(`UID SEARCH SINCE ${formatImapSearchDate(afterEpochSeconds)}`)
    const line = response.split(/\r?\n/).find((part) => part.startsWith('* SEARCH'))
    if (!line) return []
    return line
      .replace(/^\* SEARCH\s*/, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
  }

  async fetchRaw(uid: string) {
    const response = await this.command(`UID FETCH ${uid} (UID INTERNALDATE BODY.PEEK[])`)
    const sizeMatch = /\{(\d+)\}\r?\n/.exec(response)
    if (!sizeMatch || sizeMatch.index === undefined) return null

    const bodyStart = sizeMatch.index + sizeMatch[0].length
    const size = Number(sizeMatch[1])
    const raw = response.slice(bodyStart, bodyStart + size)
    const internalDate = /INTERNALDATE "([^"]+)"/.exec(response)?.[1] ?? null

    return { raw, internalDate }
  }

  async logout() {
    if (!this.socket || this.socket.destroyed) return
    try {
      await this.command('LOGOUT')
    } finally {
      this.socket.end()
      this.socket = null
    }
  }

  private async command(command: string) {
    if (!this.socket) throw new Error('IMAP connection is not open')
    const tag = `A${this.nextTag++}`
    this.socket.write(`${tag} ${command}\r\n`)
    const response = await this.readUntilTaggedResponse(tag)
    if (new RegExp(`(?:^|\\r?\\n)${tag} (?:NO|BAD)`).test(response)) {
      throw new Error(summarizeImapFailure(response, tag))
    }
    return response
  }

  private waitForGreeting() {
    if (!this.socket) throw new Error('IMAP connection is not open')
    return new Promise<void>((resolve, reject) => {
      const socket = this.socket
      if (!socket) return reject(new Error('IMAP connection is not open'))

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Timed out waiting for Gmail IMAP greeting'))
      }, 15_000)

      const cleanup = () => {
        clearTimeout(timeout)
        socket.off('data', onData)
        socket.off('error', onError)
      }
      const onData = (chunk: string) => {
        if (chunk.startsWith('* OK')) {
          cleanup()
          resolve()
        }
      }
      const onError = (error: Error) => {
        cleanup()
        reject(error)
      }

      socket.on('data', onData)
      socket.on('error', onError)
    })
  }

  private readUntilTaggedResponse(tag: string) {
    if (!this.socket) throw new Error('IMAP connection is not open')
    return new Promise<string>((resolve, reject) => {
      const socket = this.socket
      if (!socket) return reject(new Error('IMAP connection is not open'))

      let buffer = ''
      const donePattern = new RegExp(`(?:^|\\r?\\n)${tag} (?:OK|NO|BAD)`)
      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Timed out waiting for Gmail IMAP response'))
      }, 30_000)

      const cleanup = () => {
        clearTimeout(timeout)
        socket.off('data', onData)
        socket.off('error', onError)
      }
      const onData = (chunk: string) => {
        buffer += chunk
        if (donePattern.test(buffer)) {
          cleanup()
          resolve(buffer)
        }
      }
      const onError = (error: Error) => {
        cleanup()
        reject(error)
      }

      socket.on('data', onData)
      socket.on('error', onError)
    })
  }
}

export async function fetchGmailMessagesViaImap(options: ImapFetchOptions): Promise<ImapGmailMessage[]> {
  const client = new ImapClient()
  await client.connect()

  try {
    await client.login(options.emailAddress, options.appPassword)
    await client.select(process.env.GMAIL_IMAP_MAILBOX?.trim() || options.labelName)

    const uids = await client.searchSince(options.afterEpochSeconds)
    const latestUids = uids.slice(-options.maxResults).reverse()
    const messages: ImapGmailMessage[] = []

    for (const uid of latestUids) {
      const fetched = await client.fetchRaw(uid)
      if (!fetched) continue

      const parsed = parseRawEmail(fetched.raw)
      messages.push({
        id: `gmail-imap-${uid}`,
        from: parsed.headers.from ?? '',
        subject: parsed.headers.subject ?? '(no-subject)',
        body: extractTextBody(parsed),
        receivedAt: parseImapInternalDate(fetched.internalDate) ?? parseEmailDate(parsed.headers.date) ?? new Date().toISOString(),
      })
    }

    return messages
  } finally {
    await client.logout()
  }
}

function quoteImapString(value: string) {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function formatImapSearchDate(epochSeconds: number) {
  const date = new Date(epochSeconds * 1000)
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${day}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()}`
}

function summarizeImapFailure(response: string, tag: string) {
  const line = response.split(/\r?\n/).find((part) => part.startsWith(`${tag} `))
  if (!line) return 'Gmail IMAP command failed'
  return line.replace(`${tag} `, '').trim()
}

type ParsedEmail = {
  headers: Record<string, string>
  contentType: string
  transferEncoding: string
  body: string
}

function parseRawEmail(raw: string): ParsedEmail {
  const separator = raw.match(/\r?\n\r?\n/)
  const headerText = separator ? raw.slice(0, separator.index) : raw
  const body = separator && separator.index !== undefined ? raw.slice(separator.index + separator[0].length) : ''
  const headers = parseHeaders(headerText)

  return {
    headers,
    contentType: headers['content-type'] ?? 'text/plain',
    transferEncoding: headers['content-transfer-encoding'] ?? '',
    body,
  }
}

function parseHeaders(headerText: string) {
  const headers: Record<string, string> = {}
  const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ')
  for (const line of unfolded.split(/\r?\n/)) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    const name = line.slice(0, index).trim().toLowerCase()
    const value = decodeHeaderValue(line.slice(index + 1).trim())
    headers[name] = headers[name] ? `${headers[name]}, ${value}` : value
  }
  return headers
}

function extractTextBody(email: ParsedEmail): string | null {
  const contentType = email.contentType.toLowerCase()
  if (contentType.startsWith('multipart/')) {
    const boundary = getContentTypeParam(email.contentType, 'boundary')
    if (!boundary) return null

    for (const rawPart of splitMultipartBody(email.body, boundary)) {
      const parsedPart = parseRawEmail(rawPart)
      const nested = extractTextBody(parsedPart)
      if (nested && parsedPart.contentType.toLowerCase().startsWith('text/plain')) return nested
    }

    for (const rawPart of splitMultipartBody(email.body, boundary)) {
      const nested = extractTextBody(parseRawEmail(rawPart))
      if (nested) return nested
    }

    return null
  }

  const decoded = decodeTransferEncoding(email.body, email.transferEncoding)
  if (contentType.startsWith('text/html')) return stripHtml(decoded)
  if (contentType.startsWith('text/') || !contentType) return decoded
  return null
}

function splitMultipartBody(body: string, boundary: string) {
  const delimiter = `--${boundary}`
  return body
    .split(delimiter)
    .slice(1)
    .map((part) => part.replace(/^\r?\n/, ''))
    .filter((part) => part.trim() && !part.startsWith('--'))
    .map((part) => part.replace(/\r?\n--\r?\n?$/, ''))
}

function getContentTypeParam(contentType: string, param: string) {
  const pattern = new RegExp(`${param}=("(?:[^"\\\\]|\\\\.)*"|[^;\\s]+)`, 'i')
  const match = pattern.exec(contentType)
  if (!match) return null
  return match[1].replace(/^"|"$/g, '').replace(/\\"/g, '"')
}

function decodeTransferEncoding(body: string, transferEncoding: string) {
  const encoding = transferEncoding.toLowerCase()
  if (encoding === 'base64') {
    return Buffer.from(body.replace(/\s+/g, ''), 'base64').toString('utf8')
  }
  if (encoding === 'quoted-printable') {
    return decodeQuotedPrintable(body)
  }
  return body
}

function decodeQuotedPrintable(value: string) {
  return value
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9a-fA-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)))
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
}

function decodeHeaderValue(value: string) {
  return value.replace(/=\?([^?]+)\?([bqBQ])\?([^?]+)\?=/g, (_, charset: string, encoding: string, encoded: string) => {
    const raw = encoding.toLowerCase() === 'b'
      ? Buffer.from(encoded, 'base64')
      : Buffer.from(decodeQuotedPrintable(encoded.replace(/_/g, ' ')), 'binary')

    return raw.toString(charset.toLowerCase() === 'iso-8859-1' ? 'latin1' : 'utf8')
  })
}

function parseEmailDate(value?: string) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function parseImapInternalDate(value: string | null) {
  if (!value) return null
  const match = /^(\d{1,2})-([A-Za-z]{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/.exec(value)
  if (!match) return parseEmailDate(value)

  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === match[2].toLowerCase())
  if (monthIndex < 0) return null

  const offset = match[7]
  const isoOffset = `${offset.slice(0, 3)}:${offset.slice(3)}`
  const timestamp = Date.parse(
    `${match[3]}-${String(monthIndex + 1).padStart(2, '0')}-${match[1].padStart(2, '0')}T${match[4]}:${match[5]}:${match[6]}${isoOffset}`
  )

  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}
