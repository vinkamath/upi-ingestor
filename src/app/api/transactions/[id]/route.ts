import { getUser } from '@/lib/db/server'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params
  const body = (await request.json().catch(() => ({}))) as { category?: string }
  const category = body.category?.trim()

  if (!category) {
    return Response.json({ error: 'Category is required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('transactions')
    .update({ category })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true, category })
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { supabase, user } = await getUser()
  const { id } = await params

  const { error } = await supabase.from('transactions').delete().eq('id', id).eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 400 })

  return Response.json({ ok: true })
}
