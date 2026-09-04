import { createServerClient } from '@supabase/ssr'
import type { Cookie } from '@playwright/test'

/**
 * Đăng nhập bằng mật khẩu ở phía Node và trả về cookie session đúng định dạng
 * mà proxy.ts đọc được.
 *
 * Dùng chính `createServerClient` của @supabase/ssr với một cookie store trong
 * bộ nhớ: nhờ vậy tên cookie, cách chia mảnh (chunk) và cách mã hoá đều giống
 * hệt lúc chạy thật, không phải tự đoán.
 */
export async function signInCookies(
  email: string,
  password: string,
  baseURL: string,
): Promise<Cookie[]> {
  const jar = new Map<string, { value: string; options?: Record<string, unknown> }>()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          [...jar.entries()].map(([name, { value }]) => ({ name, value })),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            jar.set(name, { value, options })
          }
        },
      },
    },
  )

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Đăng nhập tài khoản test hỏng: ${error.message}`)
  if (jar.size === 0) throw new Error('Đăng nhập xong nhưng không có cookie nào')

  const { hostname } = new URL(baseURL)
  return [...jar.entries()].map(([name, { value }]) => ({
    name,
    value,
    domain: hostname,
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  }))
}
