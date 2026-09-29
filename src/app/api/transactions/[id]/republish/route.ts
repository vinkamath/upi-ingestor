import { getUser } from '@/lib/db/server'
import { publishTransactionRow } from '@/lib/publishers'
import { learnMerchantMapping } from '@/lib/merchant-mappings'

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

  await learnMerchantMapping({
    supabase,
    userId: user.id,
    merchantRaw: tx.merchant_raw,
    category,
  })

  const { publish, update } = await publishTransactionRow(user.id, tx, category)
  const { error: updateError } = await supabase
    .from('transactions')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
  if (updateError) return Response.json({ error: updateError.message }, { status: 400 })

  if (!publish.success) {
    return Response.json({ error: publish.error ?? 'Unknown publish error' }, { status: 400 })
  }

  return Response.json({ ok: true, message: 'Transaction published successfully.' })
}
