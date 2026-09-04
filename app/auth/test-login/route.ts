import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Đăng nhập bằng mật khẩu cho bộ E2E — Route Handler vì chỉ ở đây mới ghi
 * được cookie session.
 *
 * ⚠️ CHẶN CỨNG ở production. Không có cái chốt này thì đây là một endpoint
 * nhận email + mật khẩu bất kỳ, mở cho cả internet.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production' || !process.env.E2E_TEST_LOGIN) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { email, password } = (await request.json()) as {
    email?: string
    password?: string
  }
  if (!email || !password) {
    return new NextResponse('Thiếu email hoặc mật khẩu', { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return new NextResponse(error.message, { status: 401 })

  return NextResponse.json({ ok: true })
}
