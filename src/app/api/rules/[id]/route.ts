import { getUser } from '@/lib/db/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params
  const body = await request.json()

  const payload = {
    match_type: body.match_type,
    field: body.field,
    pattern: body.pattern,
    category: body.category,
    priority: body.priority,
  }

  const { data, error } = await supabase
    .from('rules')
    .update(payload)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('*')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ data })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params
  const { error } = await supabase.from('rules').delete().eq('id', id).eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
