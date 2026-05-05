import { getUser } from '@/lib/db/server'
import crypto from 'crypto'

export async function POST() {
  const { supabase, user } = await getUser()
  const linkCode = crypto.randomBytes(12).toString('hex')

  const { error } = await supabase.from('telegram_links').upsert({
    user_id: user.id,
    link_code: linkCode,
  })

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ linkCode })
}
