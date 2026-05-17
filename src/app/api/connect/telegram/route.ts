import { getUser } from '@/lib/db/server'
import crypto from 'crypto'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('telegram_links')
    .select('chat_id, linked_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return Response.json({ error: error.message }, { status: 400 })
  }

  return Response.json({
    linked: Boolean(data?.chat_id),
    linkedAt: data?.linked_at ?? null,
  })
}

export async function POST() {
  const { supabase, user } = await getUser()
  const linkCode = crypto.randomBytes(12).toString('hex')

  const { error } = await supabase.from('telegram_links').upsert({
    user_id: user.id,
    link_code: linkCode,
  }, { onConflict: 'user_id' })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ linkCode })
}
