import test from 'node:test'
import assert from 'node:assert/strict'
import { toRawEmail } from './gmail-imap'
import { parseUpiEmail } from '@/lib/parsers'

const TEXT = `Dear Customer,

Rs.70.00 is debited from your account ending 8762 towards VPA Q659683641@ybl (SHOEB NAZIR DALVI) on 08-05-26.

UPI transaction reference no.: 196835150941.

Warm regards,
HDFC Bank`

function mime(contentType: string, body: string) {
  return [
    'From: HDFC Bank InstaAlerts <alerts@hdfcbank.bank.in>',
    'To: me@example.com',
    'Subject: You have done a UPI txn. Check details!',
    'MIME-Version: 1.0',
    `Content-Type: ${contentType}; charset=utf-8`,
    '',
    body,
  ].join('\r\n')
}

test('parses a plain-text UPI email fetched over IMAP', async () => {
  const email = await toRawEmail(mime('text/plain', TEXT), { id: '18f', internalDate: '2026-05-08T10:00:00Z' })
  assert.equal(email.subject, 'You have done a UPI txn. Check details!')
  assert.ok(email.from.includes('hdfcbank'))
  assert.equal(email.receivedAt?.toISOString(), '2026-05-08T10:00:00.000Z')

  const tx = parseUpiEmail(email.id, email.from, email.body ?? '')
  assert.ok(tx)
  assert.equal(tx.amount, 70)
  assert.equal(tx.merchantRaw, 'SHOEB NAZIR DALVI')
  assert.equal(tx.bankRefId, '196835150941')
})

test('parses an HTML-only UPI email fetched over IMAP', async () => {
  const html = `<html><body><p>Dear Customer,</p><p>${TEXT.split('\n\n')[1]}</p><p>${TEXT.split('\n\n')[2]}</p></body></html>`
  const email = await toRawEmail(mime('text/html', html), { id: '190' })

  const tx = parseUpiEmail(email.id, email.from, email.body ?? '')
  assert.ok(tx)
  assert.equal(tx.merchantRaw, 'SHOEB NAZIR DALVI')
  assert.equal(tx.bankRefId, '196835150941')
})
