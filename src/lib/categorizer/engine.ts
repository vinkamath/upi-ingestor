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

function ruleMatches(rule: RuleRow, tx: ParsedTransaction) {
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

export async function categorizeTransaction(
  supabase: SupabaseClient,
  userId: string,
  tx: ParsedTransaction
): Promise<CategorizeResult> {
  const { data: rules } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', userId)
    .order('priority', { ascending: true })

  const matchingRule = (rules as RuleRow[] | null)?.find((rule) => ruleMatches(rule, tx))
  if (matchingRule) return { category: matchingRule.category, source: 'rule' }

  const merchantKey = normalizeMerchant(tx.merchantRaw)
  const { data: mapping } = await supabase
    .from('merchant_mappings')
    .select('category')
    .eq('user_id', userId)
    .eq('merchant_key', merchantKey)
    .maybeSingle()

  if (mapping?.category) return { category: mapping.category, source: 'mapping' }

  return { category: null, source: 'unknown' }
}
