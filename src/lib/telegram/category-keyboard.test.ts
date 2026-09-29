import assert from 'node:assert/strict'
import test from 'node:test'
import { buildCategoryKeyboard, parseCategoryCallback } from './category-keyboard'

const txId = '123e4567-e89b-12d3-a456-426614174000'

test('buildCategoryKeyboard', () => {
  const kb = buildCategoryKeyboard(txId, ['Groceries', 'Fast Food', 'Travel', 'x'.repeat(40)])
  assert.deepEqual(
    kb.inline_keyboard.map((row) => row.map((b) => b.text)),
    [['Groceries', 'Fast Food'], ['Travel']]
  )
})

test('parseCategoryCallback', () => {
  assert.deepEqual(parseCategoryCallback(`cat:${txId}:Bills: Rent`), { txId, category: 'Bills: Rent' })
  assert.equal(parseCategoryCallback('cat:abc'), null)
  assert.equal(parseCategoryCallback('other:abc:x'), null)
})
