import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = url.searchParams.get('next') ?? '/'
  const safeNext = next.startsWith('/') ? next : '/'
  const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      scopes: 'https://www.googleapis.com/auth/gmail.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    return NextResponse.json({ error: error?.message ?? 'OAuth init failed' }, { status: 400 })
  }

  return NextResponse.redirect(data.url)
}
