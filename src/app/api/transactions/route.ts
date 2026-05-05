import { getUser } from '@/lib/db/server'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}
