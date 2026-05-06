import { getUser } from '@/lib/db/server'
import { processUserTransactions } from '@/lib/pipeline'

export async function POST() {
  const { user } = await getUser()
  const summary = await processUserTransactions(user.id)
  return Response.json({ ok: true, summary })
}
