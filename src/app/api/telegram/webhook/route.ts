import { createClient } from '@/lib/supabase/server'
import { normalizeMerchant } from '@/lib/categorizer/normalize'
import { publishers } from '@/lib/publishers'

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  const text = body?.message?.text as string | undefined
  const chatId = body?.message?.chat?.id ? String(body.message.chat.id) : null
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

  const callback = body?.callback_query
  if (!callback?.data) return Response.json({ ok: true })

  const [prefix, txId, category] = String(callback.data).split(':')
  if (prefix !== 'cat' || !txId || !category || category === '__manual__') {
    return Response.json({ ok: true })
  }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle()
  if (!tx) return Response.json({ ok: true })

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

  await supabase
    .from('transactions')
    .update({
      category,
      status: publish.success ? 'published' : 'failed',
      published_id: publish.externalId ?? null,
    })
    .eq('id', txId)

  return Response.json({ ok: true })
}
