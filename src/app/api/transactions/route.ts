import { getUser } from '@/lib/db/server'

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
      if (!response.ok) throw new Error(`Frankfurter FX request failed with status ${response.status}`)

      const payload = (await response.json()) as Array<{ date?: string; quote?: string; rate?: number }>
      if (!Array.isArray(payload) || payload.length === 0) throw new Error('Frankfurter FX response was empty')

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

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (error) return Response.json({ error: error.message }, { status: 400 })

  const { data: monarchConnection, error: monarchError } = await supabase
    .from('monarch_connections')
    .select('fx_usd_per_inr, fx_rate_date')
    .eq('user_id', user.id)
    .maybeSingle()
  if (monarchError) return Response.json({ error: monarchError.message }, { status: 400 })

  const fxUsdPerInrRaw = monarchConnection?.fx_usd_per_inr
  const fxUsdPerInr = fxUsdPerInrRaw == null ? null : Number(fxUsdPerInrRaw)
  const today = ymdUtc(new Date())
  let resolvedUsdPerInr = Number.isFinite(fxUsdPerInr) && fxUsdPerInr > 0 ? fxUsdPerInr : null
  let resolvedRateDate = monarchConnection?.fx_rate_date ?? null

  if (!resolvedUsdPerInr || resolvedRateDate !== today) {
    try {
      const latest = await fetchPreviousCloseUsdPerInrWithRetry()
      resolvedUsdPerInr = latest.rate
      resolvedRateDate = today
      const { error: updateError } = await supabase
        .from('monarch_connections')
        .update({
          fx_usd_per_inr: latest.rate,
          fx_rate_date: today,
          fx_fetched_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
      if (updateError) return Response.json({ error: updateError.message }, { status: 400 })
    } catch {
      // Keep existing cached rate when refresh fails.
    }
  }

  return Response.json({
    data,
    fx: {
      usdPerInr: resolvedUsdPerInr,
      rateDate: resolvedRateDate,
    },
  })
}
