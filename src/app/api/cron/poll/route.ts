import { createAdminClient } from '@/lib/supabase/admin'
import { processUserTransactions } from '@/lib/pipeline'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (auth !== `Bearer ${cronSecret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let supabase
  try {
    supabase = createAdminClient()
  } catch {
    return Response.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: users, error: listError } = await supabase.from('gmail_connections').select('user_id')
  if (listError) {
    console.error('cron.poll.list_users_failed', listError)
    return Response.json({ error: 'Failed to list users' }, { status: 500 })
  }
  const summary = {
    processedUsers: 0,
    failedUsers: 0,
  }

  for (const row of users ?? []) {
    try {
      await processUserTransactions(row.user_id)
      summary.processedUsers += 1
    } catch (error) {
      summary.failedUsers += 1
      console.error('cron.poll.user_failed', { userId: row.user_id, error })
    }
  }

  return Response.json({ ok: true, ...summary, totalUsers: users?.length ?? 0 })
}
