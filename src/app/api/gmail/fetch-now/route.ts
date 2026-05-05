import { getUser } from '@/lib/db/server'
import { processUserTransactions } from '@/lib/pipeline'

export async function POST() {
  const { user } = await getUser()
  await processUserTransactions(user.id)
  return Response.json({ ok: true })
}
