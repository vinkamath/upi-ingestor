import test from 'node:test'
import assert from 'node:assert/strict'
import { parseHdfcUpiEmail } from './hdfc'

const NEW_FORMAT_EMAIL = `Dear Customer,

Greetings from HDFC Bank!

Rs.70.00 is debited from your account ending 8762 towards VPA Q659683641@ybl (SHOEB NAZIR DALVI) on 08-05-26.

UPI transaction reference no.: 196835150941.

If you did not authorize this transaction, please report it immediately at:
a. When in India (Toll free): 1800 258 6161
b. When abroad: 9122 61606160
c. Or SMS 'BLOCK UPI' to 7308080808.

We're here to support you in every step of the way.

Warm regards,
HDFC Bank`

const LEGACY_FORMAT_EMAIL = `Dear Customer, Rs.300.00 has been debited from account 8762 to VPA paytm.s25dbpf@pty Aflatoon Khan on 05-05-26. Your UPI transaction reference number is 137244521366. If you did not authorize this transaction, please report it immediately by calling 18002586161 Or SMS BLOCK UPI to 7308080808. Warm Regards, HDFC Bank`

test('parses new HDFC UPI format', () => {
  const parsed = parseHdfcUpiEmail('msg-new-1', NEW_FORMAT_EMAIL)
  assert.ok(parsed)
  assert.equal(parsed.amount, 70)
  assert.equal(parsed.merchantRaw, 'SHOEB NAZIR DALVI')
  assert.equal(parsed.bankRefId, '196835150941')
  assert.equal(parsed.occurredAt, '2026-05-08T00:00:00.000Z')
})

test('falls back to legacy HDFC UPI format', () => {
  const parsed = parseHdfcUpiEmail('msg-old-1', LEGACY_FORMAT_EMAIL)
  assert.ok(parsed)
  assert.equal(parsed.amount, 300)
  assert.equal(parsed.merchantRaw, 'Aflatoon Khan')
  assert.equal(parsed.bankRefId, '137244521366')
  assert.equal(parsed.occurredAt, '2026-05-05T00:00:00.000Z')
})

test('returns null when required fields are missing', () => {
  const missingReference = `Dear Customer, Rs.70.00 is debited from your account ending 8762 towards VPA q@ybl (Name) on 08-05-26.`
  const parsed = parseHdfcUpiEmail('msg-bad-1', missingReference)
  assert.equal(parsed, null)
})
