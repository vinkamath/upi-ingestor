import { decrypt } from '@/lib/crypto/encryption'
import { createClient } from '@/lib/supabase/server'

type MonarchAuth = {
  token?: string
  password?: string
  authTag: string
  iv: string
  content: string
}

type MonarchConnectionRow = {
  email: string
  credential_enc: MonarchAuth
  default_account_id: string | null
  fx_usd_per_inr: string | number | null
  fx_rate_date: string | null
}

function buildTokenHeader(secret: string) {
  const trimmed = secret.trim()
  if (trimmed.toLowerCase().startsWith('token ')) return trimmed
  if (trimmed.toLowerCase().startsWith('bearer ')) return `Token ${trimmed.slice(7).trim()}`
  return `Token ${trimmed}`
}

function toMonarchDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid transaction date "${value}"`)
  }
  return parsed.toISOString().slice(0, 10)
}

function ymdUtc(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toUsdAmountFromInr(amountInInr: number, usdPerInrRate: number) {
  if (!Number.isFinite(usdPerInrRate) || usdPerInrRate <= 0) {
    throw new Error('Invalid INR to USD conversion rate')
  }
  const usdAmount = amountInInr * usdPerInrRate
  return Math.round(usdAmount * 100) / 100
}

async function fetchPreviousCloseUsdPerInrWithRetry(): Promise<{ rate: number; rateDate: string }> {
  const today = new Date()
  const endDate = ymdUtc(addDaysUtc(today, -1))
  const startDate = ymdUtc(addDaysUtc(today, -7))
  const url = new URL('https://api.frankfurter.dev/v2/rates')
  url.searchParams.set('from', startDate)
  url.searchParams.set('to', endDate)
  url.searchParams.set('base', 'INR')
  url.searchParams.set('quotes', 'USD')

  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Frankfurter FX request failed with status ${response.status}`)
      }

      const payload = (await response.json()) as Array<{ date?: string; quote?: string; rate?: number }>
      if (!Array.isArray(payload) || payload.length === 0) {
        throw new Error('Frankfurter FX response was empty')
      }

      const usdRates = payload
        .filter((row) => row.quote === 'USD' && typeof row.rate === 'number' && Number.isFinite(row.rate))
        .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
      const latest = usdRates[usdRates.length - 1]
      if (!latest || !latest.date || typeof latest.rate !== 'number' || latest.rate <= 0) {
        throw new Error('Frankfurter FX response did not include a valid USD rate')
      }

      return { rate: latest.rate, rateDate: latest.date }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown FX fetch error')
      if (attempt < 3) await sleep(attempt * 500)
    }
  }

  throw lastError ?? new Error('Failed to fetch INR to USD rate')
}

export async function getMonarchAuth(userId: string): Promise<{
  email: string
  secret: string
  defaultAccountId: string | null
  fxUsdPerInr: number | null
  fxRateDate: string | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monarch_connections')
    .select('email, credential_enc, default_account_id, fx_usd_per_inr, fx_rate_date')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) throw new Error('Monarch connection missing')

  const row = data as MonarchConnectionRow
  const credential = row.credential_enc as MonarchAuth
  const secret = decrypt(credential)
  const parsedRate = row.fx_usd_per_inr == null ? null : Number(row.fx_usd_per_inr)
  const fxUsdPerInr = Number.isFinite(parsedRate) && parsedRate && parsedRate > 0 ? parsedRate : null
  return {
    email: row.email,
    secret,
    defaultAccountId: row.default_account_id,
    fxUsdPerInr,
    fxRateDate: row.fx_rate_date,
  }
}

export async function createMonarchTransaction(userId: string, payload: {
  amount: number
  merchantName: string
  category: string
  date: string
  notes?: string
}) {
  const auth = await getMonarchAuth(userId)

  if (!process.env.MONARCH_GRAPHQL_URL) {
    throw new Error('MONARCH_GRAPHQL_URL not set')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const executeGraphql = async (query: string, variables: Record<string, unknown>) => {
      const response = await fetch(process.env.MONARCH_GRAPHQL_URL!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: buildTokenHeader(auth.secret),
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      })
      const json = await response.json()
      return { response, json }
    }

    const { response: categoriesResponse, json: categoriesJson } = await executeGraphql(
      `query RuleCategories { categories { id name } }`,
      {}
    )
    const categories = (categoriesJson?.data?.categories ?? []) as Array<{ id?: string; name?: string }>
    if (!categoriesResponse.ok || !Array.isArray(categories)) {
      throw new Error(`Monarch category lookup failed: ${JSON.stringify(categoriesJson)}`)
    }

    const requestedCategory = payload.category.trim().toLowerCase()
    const matchedCategory = categories.find(
      (category) =>
        (category.id && category.id.trim().toLowerCase() === requestedCategory) ||
        (category.name && category.name.trim().toLowerCase() === requestedCategory)
    )

    if (!matchedCategory?.id) {
      throw new Error(`Monarch category not found for "${payload.category}"`)
    }

    const normalizedDate = toMonarchDate(payload.date)
    const today = ymdUtc(new Date())
    let usdPerInrRate: number | null = null

    if (auth.fxUsdPerInr && auth.fxRateDate === today) {
      usdPerInrRate = auth.fxUsdPerInr
    } else {
      try {
        const latest = await fetchPreviousCloseUsdPerInrWithRetry()
        usdPerInrRate = latest.rate
        const supabase = await createClient()
        const { error: updateError } = await supabase
          .from('monarch_connections')
          .update({
            fx_usd_per_inr: latest.rate,
            fx_rate_date: today,
            fx_fetched_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
        if (updateError) {
          throw new Error(`Unable to persist FX rate: ${updateError.message}`)
        }
      } catch (fxError) {
        if (auth.fxUsdPerInr) {
          usdPerInrRate = auth.fxUsdPerInr
        } else {
          const message = fxError instanceof Error ? fxError.message : 'Unknown FX fetch error'
          throw new Error(`INR to USD conversion failed and no cached rate exists: ${message}`)
        }
      }
    }

    const amountInUsd = toUsdAmountFromInr(payload.amount, usdPerInrRate)
    const signedAmount = amountInUsd > 0 ? -amountInUsd : amountInUsd
    const { response, json } = await executeGraphql(
      `mutation Common_CreateTransactionMutation($input: CreateTransactionMutationInput!) {
        createTransaction(input: $input) {
          transaction { id }
          errors { message code }
        }
      }`,
      {
        input: {
          accountId: auth.defaultAccountId,
          amount: signedAmount,
          merchantName: payload.merchantName.trim(),
          categoryId: matchedCategory.id,
          date: normalizedDate,
          notes: payload.notes?.trim() || undefined,
        },
      }
    )

    const topLevelErrors = (json?.errors ?? []) as Array<{ message?: string }>
    const createErrors = (json?.data?.createTransaction?.errors ?? []) as Array<{ message?: string }>
    const id = json?.data?.createTransaction?.transaction?.id as string | undefined
    if (response.ok && topLevelErrors.length === 0 && createErrors.length === 0 && id) {
      return id
    }

    const topLevelMessage = topLevelErrors.map((error) => error.message?.trim() || 'Unknown error').join('; ')
    const mutationMessage = createErrors.map((error) => error.message?.trim() || 'Unknown error').join('; ')
    throw new Error(topLevelMessage || mutationMessage || `Monarch publish failed: ${JSON.stringify(json)}`)
  } finally {
    clearTimeout(timeout)
  }
}
