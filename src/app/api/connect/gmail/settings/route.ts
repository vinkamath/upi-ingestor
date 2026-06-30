import { z } from 'zod'
import { getUser } from '@/lib/db/server'
import { getDefaultFetchDaysBack, getTodayYmdInIst } from '@/lib/email-sources/gmail-cutoff'
import { encrypt } from '@/lib/crypto/encryption'

const patchSchema = z.object({
  fetchSinceDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]),
})

const postSchema = z.object({
  emailAddress: z.email(),
  appPassword: z.string().min(1),
  fetchSinceDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()]).optional(),
})

function normalizeAppPassword(appPassword: string) {
  return appPassword.replace(/\s+/g, '')
}

function validateFetchSinceDate(fetchSinceDate: string | null | undefined) {
  if (!fetchSinceDate) return null
  const todayIst = getTodayYmdInIst()
  if (fetchSinceDate > todayIst) return 'Earliest import date cannot be in the future'
  return null
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  let json: unknown
  try {
    json = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(json)
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 })

  const { emailAddress, fetchSinceDate = null } = parsed.data
  const dateError = validateFetchSinceDate(fetchSinceDate)
  if (dateError) return Response.json({ error: dateError }, { status: 400 })

  const appPassword = normalizeAppPassword(parsed.data.appPassword)
  if (appPassword.length < 16) {
    return Response.json({ error: 'Gmail app password should be at least 16 characters' }, { status: 400 })
  }

  const { error } = await supabase
    .from('gmail_connections')
    .upsert({
      user_id: user.id,
      email_address: emailAddress.trim().toLowerCase(),
      auth_type: 'app_password',
      app_password_enc: encrypt(appPassword),
      refresh_token_enc: null,
      fetch_since_date: fetchSinceDate,
      updated_at: new Date().toISOString(),
    })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({
    ok: true,
    emailAddress: emailAddress.trim().toLowerCase(),
    fetchSinceDate,
    defaultFetchDaysBack: getDefaultFetchDaysBack(),
  })
}

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
  const dateError = validateFetchSinceDate(fetchSinceDate)
  if (dateError) return Response.json({ error: dateError }, { status: 400 })

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
