import { getUser } from '@/lib/db/server'
import { DEFAULT_PINNED_CATEGORY_NAMES } from '@/lib/monarch-categories'
import { z } from 'zod'

const patchSchema = z.object({
  pinnedCategoryNames: z.array(z.string().trim().min(1).max(200)).max(30),
})

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('pinned_category_names')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  if (!data) {
    return Response.json({
      pinnedCategoryNames: [...DEFAULT_PINNED_CATEGORY_NAMES],
      configured: false,
    })
  }

  return Response.json({
    pinnedCategoryNames: data.pinned_category_names ?? [],
    configured: true,
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

  const pinnedCategoryNames = parsed.data.pinnedCategoryNames

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: user.id,
    pinned_category_names: pinnedCategoryNames,
    updated_at: new Date().toISOString(),
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true, pinnedCategoryNames, configured: true })
}
