import { getUser } from '@/lib/db/server'

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params
  const { error } = await supabase.from('rules').delete().eq('id', id).eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json({ ok: true })
}
