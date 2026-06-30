import { getUser } from '@/lib/db/server'
import { getDefaultFetchDaysBack, getDefaultFetchMaxResults } from '@/lib/email-sources/gmail-cutoff'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('email_address, updated_at, fetch_since_date, auth_type, app_password_enc, refresh_token_enc')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  const authType = data?.auth_type === 'app_password' ? 'app_password' : 'oauth'
  const connected = Boolean(data && (data.app_password_enc || data.refresh_token_enc))

  return Response.json({
    connected,
    emailAddress: data?.email_address ?? null,
    authType,
    lastUpdatedAt: data?.updated_at ?? null,
    fetchSinceDate: data?.fetch_since_date ?? null,
    defaultFetchDaysBack: getDefaultFetchDaysBack(),
    fetchMaxResults: getDefaultFetchMaxResults(),
  })
}
