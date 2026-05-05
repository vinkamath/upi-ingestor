import { getUser } from '@/lib/db/server'

export async function GET() {
  const { supabase, user } = await getUser()
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('user_id', user.id)
    .order('priority', { ascending: true })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function POST(request: Request) {
  const { supabase, user } = await getUser()
  const body = await request.json()
  const { data, error } = await supabase.from('rules').insert({ ...body, user_id: user.id }).select('*').single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}
