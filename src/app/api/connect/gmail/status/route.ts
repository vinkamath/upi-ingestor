import { getUser } from '@/lib/db/server'
import { getDefaultFetchDaysBack, getDefaultFetchMaxResults } from '@/lib/email-sources/gmail-cutoff'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('gmail_connections')
    .select(
      'email_address, updated_at, fetch_since_date, invalid_since, last_error_code, last_error_message, last_success_at'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({
    connected: Boolean(data),
    needsReconnect: Boolean(data?.invalid_since),
    invalidSince: data?.invalid_since ?? null,
    lastErrorCode: data?.last_error_code ?? null,
    lastErrorMessage: data?.last_error_message ?? null,
    lastSuccessAt: data?.last_success_at ?? null,
    emailAddress: data?.email_address ?? null,
    lastUpdatedAt: data?.updated_at ?? null,
    fetchSinceDate: data?.fetch_since_date ?? null,
    defaultFetchDaysBack: getDefaultFetchDaysBack(),
    fetchMaxResults: getDefaultFetchMaxResults(),
  })
}
