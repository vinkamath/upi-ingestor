import { createClient } from '@/lib/supabase/server'
import { categorizeTransaction } from '@/lib/categorizer/engine'
import { fetchGmailTransactions } from '@/lib/email-sources/gmail'
import { sendTelegramMessage } from '@/lib/telegram/client'
import { publishers } from '@/lib/publishers'

export async function processUserTransactions(userId: string) {
  const supabase = await createClient()
  const txs = await fetchGmailTransactions(userId)

  for (const tx of txs) {
    try {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id,status')
        .eq('user_id', userId)
        .eq('bank_ref_id', tx.bankRefId)
        .maybeSingle()

      if (existing) continue

      const { data: inserted, error: insertError } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          source_message_id: tx.sourceMessageId,
          bank_ref_id: tx.bankRefId,
          amount: tx.amount,
          merchant_raw: tx.merchantRaw,
          merchant_normalized: tx.merchantNormalized,
          occurred_at: tx.occurredAt,
          raw_payload: tx.rawPayload,
          status: 'pending',
        })
        .select('id')
        .single()

      if (insertError || !inserted) continue

      const categorization = await categorizeTransaction(supabase, userId, tx)

      if (!categorization.category) {
        const { data: tgLink } = await supabase
          .from('telegram_links')
          .select('chat_id')
          .eq('user_id', userId)
          .maybeSingle()

        await supabase.from('transactions').update({ status: 'needs_review' }).eq('id', inserted.id)

        if (tgLink?.chat_id) {
          const { data: categories } = await supabase
            .from('rules')
            .select('category')
            .eq('user_id', userId)
            .limit(3)

          const buttons = (categories ?? []).map((c) => [
            { text: c.category, callback_data: `cat:${inserted.id}:${c.category}` },
          ])
          const sent = await sendTelegramMessage(
            tgLink.chat_id,
            `Uncategorized transaction: INR ${tx.amount} at ${tx.merchantRaw}. Pick a category:`,
            {
              inline_keyboard: [
                ...buttons,
                [{ text: 'Type new category', callback_data: `cat:${inserted.id}:__manual__` }],
              ],
            }
          )

          await supabase.from('pending_reviews').upsert(
            {
              user_id: userId,
              transaction_id: inserted.id,
              telegram_message_id: String(sent?.result?.message_id ?? ''),
              expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
            },
            { onConflict: 'transaction_id' }
          )
        }

        continue
      }

      const publisher = publishers.monarch
      const publish = await publisher.publish(userId, { ...tx, category: categorization.category })

      await supabase
        .from('transactions')
        .update({
          category: categorization.category,
          status: publish.success ? 'published' : 'failed',
          published_id: publish.externalId ?? null,
        })
        .eq('id', inserted.id)
    } catch (error) {
      console.error('pipeline.transaction_failed', { userId, bankRefId: tx.bankRefId, error })
    }
  }
}
