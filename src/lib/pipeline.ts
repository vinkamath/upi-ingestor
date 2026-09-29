import { createAdminClient } from '@/lib/supabase/admin'
import { createCategorizer } from '@/lib/categorizer/engine'
import { fetchGmailTransactions } from '@/lib/email-sources/gmail'
import { sendTelegramMessage } from '@/lib/telegram/client'
import { buildCategoryKeyboard } from '@/lib/telegram/category-keyboard'
import { DEFAULT_PINNED_CATEGORY_NAMES } from '@/lib/monarch-categories'
import { publishers } from '@/lib/publishers'
import type { ParsedTransaction } from '@/lib/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'

/** How many open (unpublished, uncategorized) transactions each run re-checks. */
const OPEN_TRANSACTION_SCAN_LIMIT = 200

type TransactionRow = {
  id: string
  status: 'pending' | 'needs_review' | 'published' | 'failed'
  amount: number | string
  merchant_raw: string
  merchant_normalized: string
  occurred_at: string
  email_received_at: string | null
  bank_ref_id: string
  source_message_id: string
  raw_payload: Record<string, unknown> | null
}

function rowToParsed(row: TransactionRow): ParsedTransaction {
  return {
    amount: Number(row.amount),
    merchantRaw: row.merchant_raw,
    merchantNormalized: row.merchant_normalized,
    occurredAt: row.occurred_at,
    emailReceivedAt: row.email_received_at ?? row.occurred_at,
    bankRefId: row.bank_ref_id,
    sourceMessageId: row.source_message_id,
    currency: 'INR',
    rawPayload: row.raw_payload ?? {},
  }
}

async function getTelegramChatId(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from('telegram_links').select('chat_id').eq('user_id', userId).maybeSingle()
  return (data?.chat_id as string | undefined) ?? null
}

async function getQuickCategories(supabase: SupabaseClient, userId: string): Promise<string[]> {
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('pinned_category_names')
    .eq('user_id', userId)
    .maybeSingle()
  return prefs?.pinned_category_names ?? [...DEFAULT_PINNED_CATEGORY_NAMES]
}

async function promptForCategory(
  supabase: SupabaseClient,
  userId: string,
  chatId: string,
  row: TransactionRow,
  quickCategories: string[]
) {
  const keyboard = buildCategoryKeyboard(row.id, quickCategories)
  // Set automatically on Vercel deployments; absent locally, where Telegram would reject a localhost link anyway.
  const appHost = process.env.VERCEL_PROJECT_PRODUCTION_URL
  const inlineKeyboard: Record<string, string>[][] = keyboard.inline_keyboard
  if (appHost) inlineKeyboard.push([{ text: 'Open transactions', url: `https://${appHost}/transactions` }])

  const sent = await sendTelegramMessage(
    chatId,
    `Uncategorized: INR ${Number(row.amount)} at ${row.merchant_raw}.\nTap a quick category, or pick another in the dashboard.`,
    { inline_keyboard: inlineKeyboard }
  )

  await supabase.from('pending_reviews').upsert(
    {
      user_id: userId,
      transaction_id: row.id,
      telegram_message_id: String(sent?.result?.message_id ?? ''),
      expires_at: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    },
    { onConflict: 'transaction_id' }
  )
}

export async function processUserTransactions(userId: string) {
  const supabase = createAdminClient()
  const fetched = await fetchGmailTransactions(userId)
  const txs = fetched.transactions
  const summary = {
    fetched: fetched.debug.matchedMessages,
    parsed: fetched.debug.parsedTransactions,
    inserted: 0,
    duplicates: 0,
    needsReview: 0,
    autoCategorized: 0,
    published: 0,
    failed: 0,
    skippedNoBody: fetched.debug.skippedNoBody,
    skippedParseFailure: fetched.debug.skippedParseFailure,
    parseErrors: fetched.debug.parseErrors,
    query: fetched.debug.query,
    sampleSubjects: fetched.debug.sampleSubjects,
    gmailError: fetched.error ?? null,
  }

  const chatId = await getTelegramChatId(supabase, userId)

  if (fetched.error?.needsReconnect && chatId) {
    try {
      await sendTelegramMessage(chatId, `UPI Ingestor: ${fetched.error.message}`)
    } catch (error) {
      console.error('pipeline.telegram_gmail_alert_failed', { userId, error })
    }
  }

  if (summary.parseErrors.length > 0 && chatId) {
    const preview = summary.parseErrors
      .slice(0, 3)
      .map((error, idx) => `${idx + 1}. ${error.subject}`)
      .join('\n')

    const moreCount = summary.parseErrors.length - 3
    const moreLine = moreCount > 0 ? `\n…and ${moreCount} more.` : ''

    try {
      await sendTelegramMessage(
        chatId,
        [
          `Parse alert: ${summary.parseErrors.length} Gmail message(s) could not be parsed.`,
          'Required fields missing/invalid: amount, merchant, reference, or date.',
          preview ? `Examples:\n${preview}${moreLine}` : '',
        ]
          .filter(Boolean)
          .join('\n\n')
      )
    } catch (error) {
      console.error('pipeline.telegram_parse_alert_failed', { userId, error })
    }
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

      const { error: insertError } = await supabase.from('transactions').insert({
        user_id: userId,
        source_message_id: tx.sourceMessageId,
        bank_ref_id: tx.bankRefId,
        amount: tx.amount,
        merchant_raw: tx.merchantRaw,
        merchant_normalized: tx.merchantNormalized,
        occurred_at: tx.occurredAt,
        email_received_at: tx.emailReceivedAt,
        raw_payload: tx.rawPayload,
        status: 'pending',
      })

      if (insertError) {
        summary.failed += 1
        continue
      }
      summary.inserted += 1
    } catch (error) {
      summary.failed += 1
      console.error('pipeline.transaction_insert_failed', { userId, bankRefId: tx.bankRefId, error })
    }
  }

  // Categorize every open transaction, not just the ones inserted in this run. This picks up
  // rows left `pending` by an interrupted run, and `needs_review` rows whose merchant has since
  // been learned (or now matches a rule). Runs even when Gmail failed so the backlog still clears.
  const { data: openRows, error: openError } = await supabase
    .from('transactions')
    .select(
      'id,status,amount,merchant_raw,merchant_normalized,occurred_at,email_received_at,bank_ref_id,source_message_id,raw_payload'
    )
    .eq('user_id', userId)
    .in('status', ['pending', 'needs_review'])
    .is('category', null)
    .is('published_id', null)
    // 'pending' sorts after 'needs_review': descending puts never-processed rows first so a
    // backlog of old uncategorized review rows can't push them past the limit.
    .order('status', { ascending: false })
    .order('occurred_at', { ascending: false })
    .limit(OPEN_TRANSACTION_SCAN_LIMIT)

  if (openError) {
    console.error('pipeline.open_transactions_load_failed', { userId, error: openError })
    return summary
  }

  const open = (openRows as TransactionRow[] | null) ?? []
  const categorize = await createCategorizer(
    supabase,
    userId,
    open.map((row) => row.merchant_raw)
  )
  let quickCategories: string[] | null = null

  for (const row of open) {
    try {
      const parsed = rowToParsed(row)
      const categorization = categorize(parsed)

      if (!categorization.category) {
        // needs_review rows were already flagged (and prompted) on an earlier run.
        if (row.status !== 'pending') continue

        // Conditional claim: a concurrent run (cron + fetch-now) that already flagged it gets no row back.
        const { data: flagged } = await supabase
          .from('transactions')
          .update({ status: 'needs_review' })
          .eq('id', row.id)
          .eq('status', 'pending')
          .select('id')
        if (!flagged?.length) continue
        summary.needsReview += 1

        if (chatId) {
          try {
            quickCategories ??= await getQuickCategories(supabase, userId)
            await promptForCategory(supabase, userId, chatId, row, quickCategories)
          } catch (error) {
            console.error('pipeline.telegram_prompt_failed', { userId, transactionId: row.id, error })
          }
        }
        continue
      }

      // Claim by setting the category while it is still null, so two concurrent runs can't both
      // publish this row to Monarch.
      const { data: claimed } = await supabase
        .from('transactions')
        .update({ category: categorization.category })
        .eq('id', row.id)
        .is('category', null)
        .select('id')
      if (!claimed?.length) continue

      summary.autoCategorized += 1
      const publish = await publishers.monarch.publish(userId, { ...parsed, category: categorization.category })
      const rawPayloadForUpdate = publish.success
        ? parsed.rawPayload
        : {
            ...parsed.rawPayload,
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
        .eq('id', row.id)
      if (publish.success) summary.published += 1
      else summary.failed += 1
    } catch (error) {
      summary.failed += 1
      console.error('pipeline.transaction_failed', { userId, transactionId: row.id, error })
    }
  }

  return summary
}
