import { getUser } from '@/lib/db/server'
import { DEFAULT_PINNED_CATEGORY_NAMES, DEFAULT_NO_REMEMBER_TAGS } from '@/lib/monarch-categories'
import { z } from 'zod'

const categoryNameList = z.array(z.string().trim().min(1).max(200)).max(30)

const patchSchema = z
  .object({
    pinnedCategoryNames: categoryNameList.optional(),
    noRememberTags: categoryNameList.optional(),
  })
  .refine((d) => d.pinnedCategoryNames !== undefined || d.noRememberTags !== undefined, {
    message: 'At least one of pinnedCategoryNames or noRememberTags is required',
  })

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('user_preferences')
    .select('pinned_category_names, no_remember_tags')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return Response.json({ error: error.message }, { status: 400 })

  if (!data) {
    return Response.json({
      pinnedCategoryNames: [...DEFAULT_PINNED_CATEGORY_NAMES],
      noRememberTags: [...DEFAULT_NO_REMEMBER_TAGS],
      configured: false,
    })
  }

  return Response.json({
    pinnedCategoryNames: data.pinned_category_names ?? [],
    noRememberTags: data.no_remember_tags ?? [],
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

  const updates: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.pinnedCategoryNames !== undefined) {
    updates.pinned_category_names = parsed.data.pinnedCategoryNames
  }
  if (parsed.data.noRememberTags !== undefined) {
    updates.no_remember_tags = parsed.data.noRememberTags
  }

  const { error } = await supabase.from('user_preferences').upsert(updates)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true, ...parsed.data, configured: true })
}
