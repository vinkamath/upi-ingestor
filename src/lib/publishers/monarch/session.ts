export type MonarchSession = {
  cookies: Record<string, string>
}

const REQUIRED_COOKIES = ['sessionid', 'csrftoken'] as const

const MONARCH_APP_ORIGIN = 'https://app.monarch.com'
const DEFAULT_CLIENT_VERSION = '2025.05'

export function monarchGraphqlUrl() {
  return process.env.MONARCH_GRAPHQL_URL ?? 'https://api.monarch.com/graphql'
}

function monarchClientVersion() {
  return process.env.MONARCH_CLIENT_VERSION ?? DEFAULT_CLIENT_VERSION
}

function parseCookieHeader(header: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq === -1) continue
    const key = part.slice(0, eq).trim()
    const value = part.slice(eq + 1).trim()
    if (key) cookies[key] = value
  }
  return cookies
}

function normalizeSessionCookies(cookies: Record<string, string>): Record<string, string> {
  for (const key of REQUIRED_COOKIES) {
    if (!cookies[key]) {
      throw new Error(`Monarch session missing required cookie: ${key}`)
    }
  }
  return {
    sessionid: cookies.sessionid,
    csrftoken: cookies.csrftoken,
  }
}

export function parseMonarchSessionInput(input: string): MonarchSession {
  const trimmed = input.trim()
  if (!trimmed) throw new Error('Monarch session cookies are required')

  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as { cookies?: Record<string, string> }
    const cookies = parsed.cookies ?? (parsed as unknown as Record<string, string>)
    if (typeof cookies !== 'object' || cookies === null || Array.isArray(cookies)) {
      throw new Error('Invalid Monarch session JSON')
    }
    return { cookies: normalizeSessionCookies(cookies) }
  }

  const header = trimmed.replace(/^cookie:\s*/i, '')
  return { cookies: normalizeSessionCookies(parseCookieHeader(header)) }
}

export function serializeMonarchSession(session: MonarchSession): string {
  return JSON.stringify(session)
}

export function deserializeMonarchSession(raw: string): MonarchSession {
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) {
    throw new Error('Stored Monarch credential is outdated; reconnect in Settings')
  }

  const parsed = JSON.parse(trimmed) as MonarchSession
  return { cookies: normalizeSessionCookies(parsed.cookies ?? {}) }
}

export function buildMonarchHeaders(session: MonarchSession): Record<string, string> {
  const cookieHeader = Object.entries(session.cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ')

  return {
    'Content-Type': 'application/json',
    'X-Csrftoken': session.cookies.csrftoken,
    Origin: MONARCH_APP_ORIGIN,
    Referer: `${MONARCH_APP_ORIGIN}/`,
    'monarch-client': 'web',
    'monarch-client-version': monarchClientVersion(),
    Cookie: cookieHeader,
  }
}

export type MonarchGraphqlResponse<T = Record<string, unknown>> = {
  data?: T
  errors?: Array<{ message?: string; code?: string }>
}

export async function monarchGraphqlFetch<TData = Record<string, unknown>>(
  session: MonarchSession,
  query: string,
  variables: Record<string, unknown> = {},
  init?: { signal?: AbortSignal }
): Promise<{ response: Response; json: MonarchGraphqlResponse<TData> }> {
  const response = await fetch(monarchGraphqlUrl(), {
    method: 'POST',
    headers: buildMonarchHeaders(session),
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
    signal: init?.signal,
  })
  const json = (await response.json()) as MonarchGraphqlResponse<TData>
  return { response, json }
}

type MonarchAccount = { id: string; displayName?: string; name?: string }

export async function fetchMonarchAccounts(session: MonarchSession) {
  const { response, json } = await monarchGraphqlFetch<{ accounts?: MonarchAccount[] }>(
    session,
    `query ConnectionCheck { accounts { id displayName name } }`
  )

  const accounts = json?.data?.accounts ?? []
  if (!response.ok || !Array.isArray(accounts)) return null

  return accounts.map((account) => ({
    id: account.id,
    name: account.displayName || account.name || account.id,
  }))
}
