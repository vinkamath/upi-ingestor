import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto/encryption'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  let next = searchParams.get('next') ?? '/'
  if (!next.startsWith('/')) next = '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const userId = data?.user?.id
      const userEmail = data?.user?.email
      const providerRefreshToken = data?.session?.provider_refresh_token

      if (userId && userEmail && providerRefreshToken) {
        const encrypted = encrypt(providerRefreshToken)
        await supabase.from('gmail_connections').upsert({
          user_id: userId,
          email_address: userEmail.toLowerCase(),
          refresh_token_enc: encrypted,
        })
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
}
