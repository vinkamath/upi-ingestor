/** Telegram rejects callback_data over 64 bytes. */
const MAX_CALLBACK_BYTES = 64

/** Two quick-category buttons per row; names too long for callback_data are dropped. */
export function buildCategoryKeyboard(txId: string, categoryNames: string[]) {
  const buttons = categoryNames
    .map((name) => ({ text: name, callback_data: `cat:${txId}:${name}` }))
    .filter((b) => Buffer.byteLength(b.callback_data) <= MAX_CALLBACK_BYTES)

  const rows: (typeof buttons)[] = []
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2))
  return { inline_keyboard: rows }
}

/** Inverse of the callback_data above. Category names may contain ':'. */
export function parseCategoryCallback(data: string) {
  const match = data.match(/^cat:([^:]+):(.+)$/)
  return match ? { txId: match[1], category: match[2] } : null
}
