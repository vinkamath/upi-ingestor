import { createClient } from '@/lib/supabase/server'
import { normalizeMerchant } from '@/lib/categorizer/normalize'
import { publishers } from '@/lib/publishers'

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const gotSecret = request.headers.get('x-telegram-bot-api-secret-token')
    if (gotSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = await createClient()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const message = typeof body === 'object' && body !== null && 'message' in body ? (body as Record<string, unknown>).message as Record<string, unknown> : undefined
  const text = typeof message?.text === 'string' ? message.text : undefined
  const chatObj = typeof message?.chat === 'object' && message.chat !== null ? (message.chat as Record<string, unknown>) : undefined
  const chatId = chatObj?.id ? String(chatObj.id) : null
  if (text?.startsWith('/start ') && chatId) {
    const linkCode = text.replace('/start ', '').trim()
    const { data: link } = await supabase
      .from('telegram_links')
      .select('user_id')
      .eq('link_code', linkCode)
      .maybeSingle()

    if (link?.user_id) {
      await supabase
        .from('telegram_links')
        .update({ chat_id: chatId, linked_at: new Date().toISOString() })
        .eq('link_code', linkCode)
    }

    return Response.json({ ok: true })
  }

  const callback =
    typeof body === 'object' && body !== null && 'callback_query' in body
      ? ((body as Record<string, unknown>).callback_query as Record<string, unknown> | undefined)
      : undefined
  if (!callback?.data) return Response.json({ ok: true })
  if (callback?.id) {
    const { data: pendingByCallback } = await supabase
      .from('pending_reviews')
      .select('id')
      .eq(
        'telegram_message_id',
        String(
          typeof callback.message === 'object' && callback.message !== null
            ? ((callback.message as Record<string, unknown>).message_id ?? '')
            : ''
        )
      )
      .maybeSingle()

    if (!pendingByCallback) return Response.json({ ok: true })
  }

  const [prefix, txId, category] = String(callback.data).split(':')
  if (prefix !== 'cat' || !txId || !category || category === '__manual__') {
    return Response.json({ ok: true })
  }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle()
  if (!tx) return Response.json({ ok: true })
  if (tx.status === 'published') return Response.json({ ok: true })

  await supabase.from('merchant_mappings').upsert({
    user_id: tx.user_id,
    merchant_key: normalizeMerchant(tx.merchant_raw),
    category,
  })

  const publish = await publishers.monarch.publish(tx.user_id, {
    amount: Number(tx.amount),
    merchantRaw: tx.merchant_raw,
    merchantNormalized: tx.merchant_normalized,
    occurredAt: tx.occurred_at,
    bankRefId: tx.bank_ref_id,
    sourceMessageId: tx.source_message_id,
    currency: 'INR',
    rawPayload: tx.raw_payload,
    category,
  })
  const rawPayloadForUpdate = publish.success
    ? tx.raw_payload
    : {
        ...(tx.raw_payload ?? {}),
        publish_error: publish.error ?? 'Unknown publish error',
      }

  await supabase
    .from('transactions')
    .update({
      category,
      status: publish.success ? 'published' : 'failed',
      published_id: publish.externalId ?? null,
      raw_payload: rawPayloadForUpdate,
    })
    .eq('id', txId)

  await supabase.from('pending_reviews').delete().eq('transaction_id', txId)

  return Response.json({ ok: true })
}
