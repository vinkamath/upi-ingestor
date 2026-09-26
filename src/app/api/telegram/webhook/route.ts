import { createAdminClient } from '@/lib/supabase/admin'
import { publishers } from '@/lib/publishers'
import { learnMerchantMapping } from '@/lib/merchant-mappings'
import { answerCallbackQuery, editTelegramMessageText, sendTelegramMessage } from '@/lib/telegram/client'
import { MANUAL_CATEGORY, parseCategoryCallback } from '@/lib/telegram/review-keyboard'
import { parseStartLinkCode } from '@/lib/telegram/start-command'

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET
  if (expectedSecret) {
    const gotSecret = request.headers.get('x-telegram-bot-api-secret-token')
    if (gotSecret !== expectedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const supabase = createAdminClient()
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
  const startLinkCode = text ? parseStartLinkCode(text) : undefined
  if (startLinkCode !== undefined && chatId) {
    if (startLinkCode === null) {
      try {
        await sendTelegramMessage(
          chatId,
          'Paste the full command from UPI Ingestor Settings (including the code after /start).'
        )
      } catch (error) {
        console.error('telegram.link_help_reply_failed', { chatId, error })
      }
      return Response.json({ ok: true })
    }

    const linkCode = startLinkCode
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

      try {
        await sendTelegramMessage(
          chatId,
          'Linked successfully. You will now receive transaction notifications here.'
        )
      } catch (error) {
        console.error('telegram.link_success_reply_failed', { chatId, error })
      }
    } else {
      try {
        await sendTelegramMessage(
          chatId,
          'Invalid or expired link code. Please generate a new code from Settings and try again.'
        )
      } catch (error) {
        console.error('telegram.link_invalid_reply_failed', { chatId, error })
      }
    }

    return Response.json({ ok: true })
  }

  const callback =
    typeof body === 'object' && body !== null && 'callback_query' in body
      ? ((body as Record<string, unknown>).callback_query as Record<string, unknown> | undefined)
      : undefined
  if (!callback?.data || typeof callback.id !== 'string') return Response.json({ ok: true })
  const callbackId = callback.id

  const callbackMessage =
    typeof callback.message === 'object' && callback.message !== null
      ? (callback.message as Record<string, unknown>)
      : undefined
  const messageId = typeof callbackMessage?.message_id === 'number' ? callbackMessage.message_id : undefined
  const messageChat =
    typeof callbackMessage?.chat === 'object' && callbackMessage.chat !== null
      ? (callbackMessage.chat as Record<string, unknown>)
      : undefined
  const messageChatId = messageChat?.id ? String(messageChat.id) : undefined
  const replyMarkup =
    typeof callbackMessage?.reply_markup === 'object' && callbackMessage.reply_markup !== null
      ? (callbackMessage.reply_markup as Record<string, unknown>)
      : undefined

  const ack = async (text?: string) => {
    try {
      await answerCallbackQuery(callbackId, text)
    } catch (error) {
      console.error('telegram.callback_ack_failed', { error })
    }
  }
  const replaceMessage = async (text: string) => {
    if (!messageChatId || messageId === undefined) return
    try {
      await editTelegramMessageText(messageChatId, messageId, text)
    } catch (error) {
      console.error('telegram.callback_edit_failed', { error })
    }
  }

  const parsed = parseCategoryCallback(String(callback.data), replyMarkup?.inline_keyboard)
  if (!parsed) {
    await ack()
    return Response.json({ ok: true })
  }
  const { txId, category } = parsed

  if (category === MANUAL_CATEGORY) {
    await ack('Typing a new category is not supported yet. Use the Transactions page.')
    return Response.json({ ok: true })
  }

  const { data: pendingReview } = await supabase
    .from('pending_reviews')
    .select('id')
    .eq('transaction_id', txId)
    .eq('telegram_message_id', String(messageId ?? ''))
    .maybeSingle()

  if (!pendingReview) {
    await ack('This transaction was already handled.')
    return Response.json({ ok: true })
  }

  const { data: tx } = await supabase.from('transactions').select('*').eq('id', txId).maybeSingle()
  if (!tx) {
    await ack('Transaction not found.')
    return Response.json({ ok: true })
  }
  if (tx.status === 'published') {
    await ack('Already published.')
    return Response.json({ ok: true })
  }

  await learnMerchantMapping({
    supabase,
    userId: tx.user_id,
    merchantRaw: tx.merchant_raw,
    category,
  })

  const publish = await publishers.monarch.publish(tx.user_id, {
    amount: Number(tx.amount),
    merchantRaw: tx.merchant_raw,
    merchantNormalized: tx.merchant_normalized,
    occurredAt: tx.occurred_at,
    emailReceivedAt: tx.email_received_at ?? tx.occurred_at,
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

  const summaryLine = `INR ${tx.amount} at ${tx.merchant_raw}`
  if (publish.success) {
    await ack(`Published as ${category}`)
    await replaceMessage(`${summaryLine}: categorized as ${category} and published to Monarch.`)
  } else {
    await ack('Publish failed')
    await replaceMessage(
      `${summaryLine}: categorized as ${category}, but publishing to Monarch failed. Retry from the Transactions page.`
    )
  }

  return Response.json({ ok: true })
}
