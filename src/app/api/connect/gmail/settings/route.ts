import { z } from 'zod'
import { getUser } from '@/lib/db/server'
import { getDefaultFetchDaysBack, getTodayYmdInIst } from '@/lib/email-sources/gmail-cutoff'

const patchSchema = z.object({
  fetchSinceDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]),
})

export async function PATCH(request: Request) {
  const { supabase, user } = await getUser()
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(json)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { fetchSinceDate } = parsed.data
  if (fetchSinceDate) {
    const todayIst = getTodayYmdInIst()
    if (fetchSinceDate > todayIst) {
      return Response.json({ error: 'Earliest import date cannot be in the future' }, { status: 400 })
    }
  }

  const { data: existing, error: existingError } = await supabase
    .from('gmail_connections')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingError) return Response.json({ error: existingError.message }, { status: 400 })
  if (!existing) {
    return Response.json({ error: 'Connect Gmail before changing import settings' }, { status: 400 })
  }

  const { error } = await supabase
    .from('gmail_connections')
    .update({
      fetch_since_date: fetchSinceDate,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({
    ok: true,
    fetchSinceDate,
    defaultFetchDaysBack: getDefaultFetchDaysBack(),
  })
}
