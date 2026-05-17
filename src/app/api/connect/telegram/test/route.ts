import { getUser } from '@/lib/db/server'
import { sendTelegramMessage } from '@/lib/telegram/client'

export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return Response.json({ error: 'TELEGRAM_BOT_TOKEN is not configured' }, { status: 500 })
  }

  const { supabase, user } = await getUser()

  let overrideChatId: string | undefined
  try {
    const body = (await request.json()) as { chatId?: unknown }
    if (typeof body.chatId === 'string' && body.chatId.trim()) {
      overrideChatId = body.chatId.trim()
    }
  } catch {
    // empty body is fine
  }

  const { data: link, error } = await supabase
    .from('telegram_links')
    .select('chat_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  const chatId = overrideChatId ?? link?.chat_id
  if (!chatId) {
    return Response.json(
      {
        error:
          'No Telegram chat linked. Enter your chat ID below, or generate a link code and send /start <code> to your bot.',
      },
      { status: 400 }
    )
  }

  try {
    await sendTelegramMessage(
      chatId,
      'Test message from UPI Ingestor — outbound Telegram is working.'
    )
    return Response.json({ ok: true, chatId })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send test message'
    return Response.json({ error: message }, { status: 502 })
  }
}
