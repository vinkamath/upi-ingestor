import { DEFAULT_PINNED_CATEGORY_NAMES } from '@/lib/monarch-categories'
import type { SupabaseClient } from '@supabase/supabase-js'

type InlineButton = { text: string; callback_data?: string }
type InlineKeyboard = InlineButton[][]

export const MANUAL_CATEGORY = '__manual__'

/** Quick categories from Settings; defaults apply until the user saves their own. */
export async function loadQuickCategoryNames(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_preferences')
    .select('pinned_category_names')
    .eq('user_id', userId)
    .maybeSingle()

  if (!data) return [...DEFAULT_PINNED_CATEGORY_NAMES]
  return data.pinned_category_names ?? []
}

/**
 * Telegram caps callback_data at 64 bytes and the transaction id alone is 36, so buttons carry
 * an index (`c:<txId>:<i>`) and the category name is read back from the tapped button's label.
 */
export function buildReviewKeyboard(txId: string, categoryNames: string[]): { inline_keyboard: InlineKeyboard } {
  const buttons = categoryNames.map((name, i) => ({ text: name, callback_data: `c:${txId}:${i}` }))
  const rows: InlineKeyboard = []
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2))
  rows.push([{ text: 'Type new category', callback_data: `cat:${txId}:${MANUAL_CATEGORY}` }])
  return { inline_keyboard: rows }
}

/**
 * Resolves a category button tap. Accepts the index form from buildReviewKeyboard and the
 * older `cat:<txId>:<name>` form still present on messages sent before it.
 */
export function parseCategoryCallback(
  data: string,
  keyboard: unknown
): { txId: string; category: string } | null {
  const [prefix, txId, ...rest] = data.split(':')
  const value = rest.join(':')
  if (!txId || !value) return null

  if (prefix === 'cat') return { txId, category: value }
  if (prefix !== 'c') return null

  const rows = Array.isArray(keyboard) ? (keyboard as unknown[]) : []
  for (const row of rows) {
    if (!Array.isArray(row)) continue
    for (const button of row as InlineButton[]) {
      if (button?.callback_data === data && typeof button.text === 'string' && button.text) {
        return { txId, category: button.text }
      }
    }
  }
  return null
}
