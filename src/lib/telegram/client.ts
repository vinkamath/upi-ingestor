const baseUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`

export async function sendTelegramMessage(chatId: string, text: string, replyMarkup?: Record<string, unknown>) {
  const response = await fetch(`${baseUrl}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    }),
  })

  if (!response.ok) {
    throw new Error(`Telegram send failed: ${response.status}`)
  }

  return response.json()
}
