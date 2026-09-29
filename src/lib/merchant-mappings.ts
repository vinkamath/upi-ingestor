import { normalizeMerchant } from '@/lib/categorizer/normalize'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function learnMerchantMapping(args: {
  supabase: SupabaseClient
  userId: string
  merchantRaw: string
  category: string
  keep?: number
}) {
  const keep = typeof args.keep === 'number' && args.keep >= 0 ? args.keep : 5000
  const merchantKey = normalizeMerchant(args.merchantRaw)
  if (!merchantKey) return { ok: false as const, reason: 'empty_merchant_key' as const }

  const { data: prefs } = await args.supabase
    .from('user_preferences')
    .select('no_remember_tags')
    .eq('user_id', args.userId)
    .maybeSingle()

  const noRememberTags: string[] = prefs?.no_remember_tags ?? []
  const isNoRemember = noRememberTags.some(
    (tag) => tag.localeCompare(args.category, undefined, { sensitivity: 'accent' }) === 0
  )
  if (isNoRemember) return { ok: true as const, merchantKey, skipped: true as const }

  const nowIso = new Date().toISOString()

  const { error: upsertError } = await args.supabase.from('merchant_mappings').upsert(
    {
      user_id: args.userId,
      merchant_key: merchantKey,
      category: args.category,
      last_seen_at: nowIso,
    },
    { onConflict: 'user_id,merchant_key' }
  )
  if (upsertError) return { ok: false as const, reason: upsertError.message }

  const { error: pruneError } = await args.supabase.rpc('prune_merchant_mappings', {
    p_user_id: args.userId,
    p_keep: keep,
  })
  if (pruneError) return { ok: false as const, reason: pruneError.message }

  const appliedTo = await applyCategoryToOpenTransactions({
    supabase: args.supabase,
    userId: args.userId,
    merchantKey,
    category: args.category,
  })

  return { ok: true as const, merchantKey, appliedTo }
}

/**
 * Fills in the category on other uncategorized, unpublished review rows from the same merchant,
 * so categorizing one transaction categorizes its siblings too. Status is left as-is so the
 * user still reviews and publishes them.
 */
async function applyCategoryToOpenTransactions(args: {
  supabase: SupabaseClient
  userId: string
  merchantKey: string
  category: string
}) {
  const { data: rows, error } = await args.supabase
    .from('transactions')
    .select('id,merchant_raw')
    .eq('user_id', args.userId)
    .eq('status', 'needs_review')
    .is('category', null)
    .is('published_id', null)
    .limit(500)
  if (error || !rows) return 0

  const ids = (rows as Array<{ id: string; merchant_raw: string }>)
    .filter((row) => normalizeMerchant(row.merchant_raw) === args.merchantKey)
    .map((row) => row.id)
  if (ids.length === 0) return 0

  const { error: updateError } = await args.supabase
    .from('transactions')
    .update({ category: args.category })
    .eq('user_id', args.userId)
    .in('id', ids)
  if (updateError) return 0
  return ids.length
}
