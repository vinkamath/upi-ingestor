import { getUser } from '@/lib/db/server'
import { getDefaultFetchDaysBack, getDefaultFetchMaxResults } from '@/lib/email-sources/gmail-cutoff'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('email_address, updated_at, fetch_since_date')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({
    connected: Boolean(data),
    emailAddress: data?.email_address ?? null,
    lastUpdatedAt: data?.updated_at ?? null,
    fetchSinceDate: data?.fetch_since_date ?? null,
    defaultFetchDaysBack: getDefaultFetchDaysBack(),
    fetchMaxResults: getDefaultFetchMaxResults(),
  })
}
