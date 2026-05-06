import { getUser } from '@/lib/db/server'
import { publishers } from '@/lib/publishers'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { category?: string }

  const { data: tx, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (txError) return Response.json({ error: txError.message }, { status: 400 })
  if (!tx) return Response.json({ error: 'Transaction not found' }, { status: 404 })
  const category = body.category?.trim() || tx.category
  if (!category) return Response.json({ error: 'Cannot publish without a category' }, { status: 400 })

  const publish = await publishers.monarch.publish(user.id, {
    amount: Number(tx.amount),
    merchantRaw: tx.merchant_raw,
    merchantNormalized: tx.merchant_normalized,
    occurredAt: tx.occurred_at,
    bankRefId: tx.bank_ref_id,
    sourceMessageId: tx.source_message_id,
    currency: 'INR',
    rawPayload: tx.raw_payload ?? {},
    category,
  })

  const nextRawPayload = publish.success
    ? tx.raw_payload
    : {
        ...(tx.raw_payload ?? {}),
        publish_error: publish.error ?? 'Unknown publish error',
      }

  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      category,
      status: publish.success ? 'published' : 'failed',
      published_id: publish.externalId ?? null,
      raw_payload: nextRawPayload,
    })
    .eq('id', id)
    .eq('user_id', user.id)
  if (updateError) return Response.json({ error: updateError.message }, { status: 400 })

  if (!publish.success) {
    return Response.json({ error: publish.error ?? 'Unknown publish error' }, { status: 400 })
  }

  return Response.json({ ok: true, message: 'Transaction published successfully.' })
}
