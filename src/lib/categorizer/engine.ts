import { normalizeMerchant } from './normalize'
import type { CategorizeResult, ParsedTransaction } from '@/lib/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'

type RuleRow = {
  id: string
  match_type: 'regex' | 'contains' | 'equals'
  field: 'merchant' | 'sender' | 'body'
  pattern: string
  category: string
  priority: number
}

type CategorizableTransaction = Pick<ParsedTransaction, 'merchantRaw' | 'rawPayload'>

function ruleMatches(rule: RuleRow, tx: CategorizableTransaction) {
  const value =
    rule.field === 'merchant'
      ? tx.merchantRaw
      : rule.field === 'sender'
        ? String(tx.rawPayload.sender ?? '')
        : String(tx.rawPayload.body ?? '')

  if (rule.match_type === 'equals') return value.toLowerCase() === rule.pattern.toLowerCase()
  if (rule.match_type === 'contains') return value.toLowerCase().includes(rule.pattern.toLowerCase())

  try {
    return new RegExp(rule.pattern, 'i').test(value)
  } catch {
    return false
  }
}

const MAPPING_LOOKUP_CHUNK = 100

/**
 * Loads a user's rules, plus the merchant mappings for the given merchants, once so many
 * transactions can be categorized without a round trip per transaction.
 */
export async function createCategorizer(supabase: SupabaseClient, userId: string, merchantRaws: string[]) {
  const { data: rules, error: rulesError } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })
  if (rulesError) console.error('categorizer.rules_load_failed', { userId, error: rulesError })
  const ruleRows = (rules as RuleRow[] | null) ?? []

  const merchantKeys = [...new Set(merchantRaws.map(normalizeMerchant).filter(Boolean))]
  const mappingByKey = new Map<string, string>()
  for (let i = 0; i < merchantKeys.length; i += MAPPING_LOOKUP_CHUNK) {
    const { data: mappings, error: mappingsError } = await supabase
      .from('merchant_mappings')
      .select('merchant_key,category')
      .eq('user_id', userId)
      .in('merchant_key', merchantKeys.slice(i, i + MAPPING_LOOKUP_CHUNK))
    if (mappingsError) {
      console.error('categorizer.mappings_load_failed', { userId, error: mappingsError })
      continue
    }
    for (const row of (mappings as Array<{ merchant_key: string; category: string | null }> | null) ?? []) {
      if (row.category) mappingByKey.set(row.merchant_key, row.category)
    }
  }

  return (tx: CategorizableTransaction): CategorizeResult => {
    const matchingRule = ruleRows.find((rule) => ruleMatches(rule, tx))
    if (matchingRule) return { category: matchingRule.category, source: 'rule' }

    const mapped = mappingByKey.get(normalizeMerchant(tx.merchantRaw))
    if (mapped) return { category: mapped, source: 'mapping' }

    return { category: null, source: 'unknown' }
  }
}
