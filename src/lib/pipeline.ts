import { createClient } from '@/lib/supabase/server'
import { categorizeTransaction } from '@/lib/categorizer/engine'
import { fetchGmailTransactions } from '@/lib/email-sources/gmail'
import { sendTelegramMessage } from '@/lib/telegram/client'
import { publishers } from '@/lib/publishers'

export async function processUserTransactions(userId: string) {
  const supabase = await createClient()
  const fetched = await fetchGmailTransactions(userId)
  const txs = fetched.transactions
  const summary = {
    fetched: fetched.debug.matchedMessages,
    parsed: fetched.debug.parsedTransactions,
    inserted: 0,
    duplicates: 0,
    needsReview: 0,
    published: 0,
    failed: 0,
    skippedNoBody: fetched.debug.skippedNoBody,
    skippedParseFailure: fetched.debug.skippedParseFailure,
    query: fetched.debug.query,
    sampleSubjects: fetched.debug.sampleSubjects,
  }

  for (const tx of txs) {
    try {
      const { data: existing } = await supabase
        .from('transactions')
        .select('id,status')
        .eq('user_id', userId)
        .eq('bank_ref_id', tx.bankRefId)
        .maybeSingle()

      if (existing) {
        summary.duplicates += 1
        continue
      }

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

      if (insertError || !inserted) {
        summary.failed += 1
        continue
      }
      summary.inserted += 1

      const categorization = await categorizeTransaction(supabase, userId, tx)

      if (!categorization.category) {
        const { data: tgLink } = await supabase
          .from('telegram_links')
          .select('chat_id')
          .eq('user_id', userId)
          .maybeSingle()

        await supabase.from('transactions').update({ status: 'needs_review' }).eq('id', inserted.id)
        summary.needsReview += 1

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
      const rawPayloadForUpdate = publish.success
        ? tx.rawPayload
        : {
            ...tx.rawPayload,
            publish_error: publish.error ?? 'Unknown publish error',
          }

      await supabase
        .from('transactions')
        .update({
          category: categorization.category,
          status: publish.success ? 'published' : 'failed',
          published_id: publish.externalId ?? null,
          raw_payload: rawPayloadForUpdate,
        })
        .eq('id', inserted.id)
      if (publish.success) summary.published += 1
      else summary.failed += 1
    } catch (error) {
      summary.failed += 1
      console.error('pipeline.transaction_failed', { userId, bankRefId: tx.bankRefId, error })
    }
  }

  return summary
}
