const baseUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

async function callTelegram(method: string, body: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = (await response.json()) as { ok?: boolean; description?: string; result?: { message_id?: number } }

  if (!response.ok || data.ok === false) {
    const detail = data.description ?? `HTTP ${response.status}`
    throw new Error(`Telegram ${method} failed: ${detail}`)
  }

  return data
}

export function sendTelegramMessage(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  return callTelegram('sendMessage', { chat_id: chatId, text, reply_markup: replyMarkup })
}

/** Stops the loading spinner on the tapped button; `text` shows as a toast. */
export function answerTelegramCallback(callbackQueryId: string, text?: string) {
  return callTelegram('answerCallbackQuery', { callback_query_id: callbackQueryId, text })
}

/** Replaces the message text and drops its inline keyboard. */
export function editTelegramMessage(chatId: string, messageId: number, text: string) {
  return callTelegram('editMessageText', { chat_id: chatId, message_id: messageId, text })
}
