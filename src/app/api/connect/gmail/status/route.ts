import { getUser } from '@/lib/db/server'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('gmail_connections')
    .select('email_address, updated_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({
    connected: Boolean(data),
    emailAddress: data?.email_address ?? null,
    lastUpdatedAt: data?.updated_at ?? null,
  })
}
