import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReviewKeyboard, MANUAL_CATEGORY, parseCategoryCallback } from './review-keyboard'

const txId = '123e4567-e89b-12d3-a456-426614174000'

test('buildReviewKeyboard lays out quick categories two per row with a manual row last', () => {
  const { inline_keyboard } = buildReviewKeyboard(txId, ['Groceries', 'Travel', 'Restaurants & Bars'])
  assert.deepEqual(
    inline_keyboard.map((row) => row.map((b) => b.text)),
    [['Groceries', 'Travel'], ['Restaurants & Bars'], ['Type new category']]
  )
  assert.equal(inline_keyboard[2][0].callback_data, `cat:${txId}:${MANUAL_CATEGORY}`)
})

test('callback_data stays within Telegram 64-byte limit for long category names', () => {
  const { inline_keyboard } = buildReviewKeyboard(txId, ['A very long Monarch category name & more'])
  for (const row of inline_keyboard) {
    for (const b of row) assert.ok(Buffer.byteLength(b.callback_data ?? '') <= 64)
  }
})

test('parseCategoryCallback resolves the tapped button label', () => {
  const { inline_keyboard } = buildReviewKeyboard(txId, ['Groceries', 'Travel'])
  assert.deepEqual(parseCategoryCallback(`c:${txId}:1`, inline_keyboard), { txId, category: 'Travel' })
  assert.equal(parseCategoryCallback(`c:${txId}:5`, inline_keyboard), null)
})

test('parseCategoryCallback accepts legacy name-based data', () => {
  assert.deepEqual(parseCategoryCallback(`cat:${txId}:Fast Food`, undefined), { txId, category: 'Fast Food' })
  assert.deepEqual(parseCategoryCallback(`cat:${txId}:${MANUAL_CATEGORY}`, undefined), {
    txId,
    category: MANUAL_CATEGORY,
  })
  assert.equal(parseCategoryCallback('nope', undefined), null)
})
