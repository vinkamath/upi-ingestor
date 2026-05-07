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

  return { ok: true as const, merchantKey }
}

