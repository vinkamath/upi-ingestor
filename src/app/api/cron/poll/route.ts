import { createClient } from '@/lib/supabase/server'
import { processUserTransactions } from '@/lib/pipeline'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createClient()
  const { data: users } = await supabase.from('gmail_connections').select('user_id')

  for (const row of users ?? []) {
    await processUserTransactions(row.user_id)
  }

  return Response.json({ ok: true, processedUsers: users?.length ?? 0 })
}
