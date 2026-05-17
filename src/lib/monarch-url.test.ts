import test from 'node:test'
import assert from 'node:assert/strict'
import { buildMonarchTransactionsUrl, toTransactionYmd } from './monarch-url'

test('toTransactionYmd returns date-only strings unchanged', () => {
  assert.equal(toTransactionYmd('2026-05-03'), '2026-05-03')
})

test('toTransactionYmd normalizes ISO timestamps to YYYY-MM-DD', () => {
  assert.equal(toTransactionYmd('2026-05-03T18:30:00.000Z'), '2026-05-03')
})

test('buildMonarchTransactionsUrl builds Monarch transactions filter URL', () => {
  assert.equal(
    buildMonarchTransactionsUrl('223448419850994458', '2026-05-03', '2026-05-06'),
    'https://app.monarch.com/transactions?accounts=223448419850994458&startDate=2026-05-03&endDate=2026-05-06'
  )
})
