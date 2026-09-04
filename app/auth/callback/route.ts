import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Đích đến của liên kết trong email. Route Handler chứ không phải Server
 * Component vì chỉ ở đây (và proxy) mới GHI được cookie session.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
