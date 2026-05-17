import assert from 'node:assert/strict'
import test from 'node:test'
import { parseStartLinkCode } from './start-command'

test('parseStartLinkCode', () => {
  assert.equal(parseStartLinkCode('/start abc123'), 'abc123')
  assert.equal(parseStartLinkCode('/start@MyBot abc123'), 'abc123')
  assert.equal(parseStartLinkCode('/start'), null)
  assert.equal(parseStartLinkCode('/start@MyBot'), null)
  assert.equal(parseStartLinkCode('hello'), undefined)
})
